// Chấm phát âm qua iFLYTEK (thay cho Azure).
// Client ghi âm -> hạ sample về PCM 16k/16bit/mono -> stream qua WebSocket
// tới gtc-api -> backend ký HMAC + gọi iFLYTEK ISE (chấm điểm) + IAT ("Nội
// dung bạn nói") -> trả kết quả.
//
// Giữ nguyên "giao diện" như bản Azure: assessPronunciation(text) trả về
// { result: Promise, stop() } để SpeakingPracticeModal không phải đổi nhiều.

const TARGET_RATE = 16000
const OVERALL_TIMEOUT_MS = 20000 // iFLYTEK cần gửi audio + chờ chấm, để rộng hơn Azure

// URL WebSocket tới backend. Suy ra từ VITE_API_URL (vd https://.../api ->
// wss://.../ws/pronunciation). Cho phép override bằng VITE_PRON_WS_URL.
function resolveWsUrl() {
    const override = import.meta.env.VITE_PRON_WS_URL
    if (override) return override

    const apiUrl = import.meta.env.VITE_API_URL || ''
    try {
        const u = new URL(apiUrl, window.location.origin)
        const proto = u.protocol === 'https:' ? 'wss:' : 'ws:'
        return `${proto}//${u.host}/ws/pronunciation`
    } catch {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        return `${proto}//${window.location.host}/ws/pronunciation`
    }
}

// Float32 [-1,1] -> Int16 PCM, kèm hạ sample rate về 16k.
function downsampleToPCM16(float32, inRate) {
    const ratio = inRate / TARGET_RATE
    const outLen = Math.floor(float32.length / ratio)
    const out = new Int16Array(outLen)
    for (let i = 0; i < outLen; i++) {
        const s = Math.max(-1, Math.min(1, float32[Math.floor(i * ratio)]))
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return out
}

export function isSpeechSupported() {
    return typeof window !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

// Diễn giải except_info của iFLYTEK thành lý do bị từ chối, dễ hiểu cho học
// viên. Trả về { reason, message }:
//  - reason: mã ngắn để UI phân biệt ('mispronounced' | 'too_quiet' | ...)
//  - message: câu tiếng Việt hiển thị.
// Xem tài liệu iFLYTEK: except_info=28673 (0x7001) không có tiếng/quá nhỏ,
// 28676 (0x7004) đọc bừa/sai nội dung, 28680 (0x7008) nhiễu nhiều,
// 28690 (0x7012) âm bị cắt/quá to, 28689 (0x7011) không có audio.
function interpretRejection(exceptInfo) {
    const code = parseInt(exceptInfo, 10)
    switch (code) {
        case 28673: // 0x7001 - không có tiếng hoặc quá nhỏ
        case 28689: // 0x7011 - không có audio đầu vào
            return {
                reason: 'too_quiet',
                message: 'Chưa nghe rõ tiếng. Hãy đọc to hơn và lại gần micro nhé.',
            }
        case 28680: // 0x7008 - tỉ lệ nhiễu cao
            return {
                reason: 'noisy',
                message: 'Xung quanh hơi ồn nên nghe chưa rõ. Thử lại ở nơi yên tĩnh hơn nhé.',
            }
        case 28690: // 0x7012 - âm bị cắt/quá to
            return {
                reason: 'clipped',
                message: 'Âm thanh bị vỡ do đọc quá to hoặc quá gần mic. Đọc nhẹ hơn một chút nhé.',
            }
        case 28676: // 0x7004 - đọc bừa / sai nội dung
        default:
            // Mặc định (kể cả khi không có except_info): coi là đọc chưa khớp
            // câu mẫu — đây là trường hợp phổ biến nhất khi bị từ chối.
            return {
                reason: 'mispronounced',
                message:
                    'Bài đọc chưa khớp với câu mẫu nên chưa thể chấm điểm. Hãy nghe lại câu mẫu và đọc đúng từng chữ nhé.',
            }
    }
}

// Trả về { result: Promise, stop() }.
export function assessPronunciation(referenceText, { onListening } = {}) {
    let ws = null
    let audioCtx = null
    let processor = null
    let source = null
    let stream = null
    let recording = false
    let settled = false
    let timeoutId = null

    const cleanupAudio = () => {
        recording = false
        try {
            if (processor) processor.disconnect()
        } catch (e) { /* bỏ qua */ }
        try {
            if (source) source.disconnect()
        } catch (e) { /* bỏ qua */ }
        try {
            if (stream) stream.getTracks().forEach((t) => t.stop())
        } catch (e) { /* bỏ qua */ }
        // Chỉ đóng khi AudioContext chưa đóng; close() trả Promise nên phải
        // .catch để không thành "Uncaught (in promise)".
        if (audioCtx && audioCtx.state !== 'closed') {
            audioCtx.close().catch(() => { })
        }
        processor = null
        source = null
        stream = null
        audioCtx = null
    }

    const closeWs = () => {
        try {
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) ws.close()
        } catch (e) {
            /* bỏ qua */
        }
    }

    const result = new Promise((resolve, reject) => {
        const finish = (fn, payload) => {
            if (settled) return
            settled = true
            if (timeoutId) clearTimeout(timeoutId)
            timeoutId = null
            cleanupAudio()
            closeWs()
            fn(payload)
        }

        // Lớp bảo vệ: timeout tổng — không bao giờ đơ vĩnh viễn.
        timeoutId = setTimeout(() => {
            finish(reject, 'Quá thời gian chờ xử lý. Vui lòng kiểm tra kết nối mạng và thử lại nhé.')
        }, OVERALL_TIMEOUT_MS)

        const wsUrl = resolveWsUrl()
        try {
            ws = new WebSocket(wsUrl)
        } catch (e) {
            finish(reject, 'Không kết nối được máy chủ chấm điểm.')
            return
        }
        ws.binaryType = 'arraybuffer'

        ws.onopen = async () => {
            ws.send(JSON.stringify({ type: 'start', text: referenceText }))

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
                })
            } catch (e) {
                finish(reject, 'Không truy cập được microphone. Kiểm tra quyền trình duyệt.')
                return
            }

            audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            source = audioCtx.createMediaStreamSource(stream)
            processor = audioCtx.createScriptProcessor(4096, 1, 1)
            processor.onaudioprocess = (e) => {
                if (!recording) return
                const input = e.inputBuffer.getChannelData(0)
                const pcm = downsampleToPCM16(input, audioCtx.sampleRate)
                if (ws && ws.readyState === WebSocket.OPEN) ws.send(pcm.buffer)
            }
            source.connect(processor)
            processor.connect(audioCtx.destination)
            recording = true
            // Mic ĐÃ thật sự thu — báo UI chuyển sang "Đang lắng nghe" từ lúc này,
            // tránh cảnh UI báo nghe trước khi mic sẵn sàng làm mất phần đầu câu.
            if (typeof onListening === 'function') onListening()
        }

        ws.onmessage = (evt) => {
            let msg
            try {
                msg = JSON.parse(evt.data)
            } catch {
                return
            }
            if (msg.type === 'result') {
                const s = msg.summary || {}

                // Bài bị iFLYTEK từ chối (đọc bừa / im lặng / nhiễu / quá nhỏ).
                // CÁCH B: KHÔNG reject cứng nữa. Vẫn resolve về kết quả có cờ
                // "rejected" + lý do + "Nội dung bạn nói" (IAT), để học viên tự
                // thấy mình đã đọc ra gì và biết đường sửa — văn minh hơn.
                if (s.is_rejected) {
                    const { reason, message } = interpretRejection(s.except_info)
                    finish(resolve, {
                        rejected: true,
                        rejectReason: reason,
                        rejectMessage: message,
                        spokenText: msg.spokenText || '',
                        // Không có điểm hợp lệ khi bị từ chối.
                        pronScore: null,
                        accuracy: null,
                        prosody: null,
                        fluency: null,
                        completeness: null,
                        chars: [],
                        raw: s,
                    })
                    return
                }

                // Giữ CÁCH TÍNH CŨ: mỗi tiêu chí quy về 25 điểm rồi cộng lại.
                // iFLYTEK trả mỗi tiêu chí trên thang 100 -> chia 4 để ra /25.
                const toQuarter = (v) => (typeof v === 'number' ? Math.round(v / 4) : 0)
                const phone = toQuarter(s.phone_score)
                const tone = toQuarter(s.tone_score)
                const fluency = toQuarter(s.fluency_score)
                const integrity = toQuarter(s.integrity_score)
                const pronScore = phone + tone + fluency + integrity // tổng /100

                finish(resolve, {
                    rejected: false,
                    // 4 tiêu chí quy về /25 (đặt tên khớp thứ tự UI cũ)
                    accuracy: phone, // "Phát âm (âm)" ~ phone_score
                    prosody: tone, // "Thanh điệu" ~ tone_score
                    fluency, // "Trôi chảy"
                    completeness: integrity, // "Đầy đủ"
                    pronScore,
                    // điểm gốc iFLYTEK (thang 100) — để dành nếu sau muốn hiển thị thẳng
                    raw: s,
                    // chi tiết từng chữ: { content, pinyin, issue, ok }
                    chars: msg.chars || [],
                    spokenText: msg.spokenText || '',
                })
            } else if (msg.type === 'error') {
                finish(reject, msg.message || 'Có lỗi xảy ra, thử lại nhé.')
            }
        }

        ws.onerror = () => {
            finish(reject, 'Lỗi kết nối tới máy chủ chấm điểm. Kiểm tra mạng và thử lại.')
        }

        ws.onclose = () => {
            // Nếu đóng mà chưa có kết quả -> coi như lỗi (trừ khi đã settled).
            if (!settled) finish(reject, 'Mất kết nối khi đang chấm. Thử lại nhé.')
        }
    })

    // Gửi mốc kết thúc để backend bắt đầu chấm (không đóng WS — chờ kết quả).
    const stop = () => {
        cleanupAudio()
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'end' }))
        }
    }

    return { result, stop }
}

// Chuyển pinyin dạng số của iFLYTEK (jin1, lv3, qi9...) sang dạng dấu thanh.
export function pinyinWithToneMarks(py) {
    if (!py) return ''
    return py
        .split(/([|\s]+)/)
        .map((part) => {
            const m = part.match(/^([a-zü]+?)([0-9])$/i)
            if (!m) return part
            let syl = m[1]
            const tone = parseInt(m[2], 10)
            syl = syl.replace(/v/g, 'ü').replace(/V/g, 'Ü')
            if (tone < 1 || tone > 4) return syl
            const marks = {
                a: ['ā', 'á', 'ǎ', 'à'],
                e: ['ē', 'é', 'ě', 'è'],
                i: ['ī', 'í', 'ǐ', 'ì'],
                o: ['ō', 'ó', 'ǒ', 'ò'],
                u: ['ū', 'ú', 'ǔ', 'ù'],
                ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
            }
            let idx = -1
            const lower = syl.toLowerCase()
            if (lower.includes('a')) idx = lower.indexOf('a')
            else if (lower.includes('e')) idx = lower.indexOf('e')
            else if (lower.includes('ou')) idx = lower.indexOf('o')
            else {
                for (let i = syl.length - 1; i >= 0; i--) {
                    if ('aeiouü'.includes(lower[i])) {
                        idx = i
                        break
                    }
                }
            }
            if (idx === -1) return syl
            const ch = lower[idx]
            const marked = marks[ch] ? marks[ch][tone - 1] : syl[idx]
            return syl.slice(0, idx) + marked + syl.slice(idx + 1)
        })
        .join('')
}