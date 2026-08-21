// Chấm phát âm qua iFLYTEK (thay cho Azure).
// Client ghi âm -> hạ sample về PCM 16k/16bit/mono -> stream qua WebSocket
// tới gtc-api -> backend ký HMAC + gọi iFLYTEK ISE (chấm điểm) + IAT ("Nội
// dung bạn nói") -> trả kết quả.
//
// Giữ nguyên "giao diện" như bản Azure: assessPronunciation(text) trả về
// { result: Promise, stop() } để SpeakingPracticeModal không phải đổi nhiều.

import { attachLevelMeter } from './micLevel.js'
import { encodeWav } from './wavEncoder.js'
import { getStudentToken } from './studentAuth.js'

// Worklet nằm trong public/ nên được phục vụ nguyên xi tại đường dẫn cố định.
// Ghép với BASE_URL để vẫn đúng khi ứng dụng deploy dưới thư mục con.
// Xem đầu file public/worklets/pcm-recorder.js để biết vì sao không đặt trong src/.
const PCM_WORKLET_URL = `${import.meta.env.BASE_URL}worklets/pcm-recorder.js`

const TARGET_RATE = 16000

// Kích thước block của ScriptProcessorNode. Ở 16kHz, 1024 frame = 64ms audio.
// Trước đây dùng 4096 frame: ở 16kHz đó là 256ms, nghĩa là block đang thu dở
// khi học viên bấm "Dừng" có thể chứa tới 1/4 giây — đủ để nuốt trọn âm tiết
// cuối câu.
const BLOCK_SIZE = 1024

// Sau khi bấm "Dừng", giữ audio graph sống thêm một nhịp để block đang thu dở
// được đẩy nốt lên WebSocket rồi mới gửi mốc 'end'. Nếu tháo graph ngay (như
// bản cũ) thì phần đuôi câu bị vứt -> iFLYTEK báo chữ cuối sai hoặc "đọc thiếu".
const TAIL_FLUSH_MS = 300

// Tần số cắt cho bộ lọc chống aliasing ở nhánh dự phòng. Nyquist của 16kHz là
// 8kHz; chừa khoảng dốc cho bộ lọc nên cắt ở 6kHz.
const ANTIALIAS_CUTOFF_HZ = 6000
const ANTIALIAS_STAGES = 4

// Constraint microphone cho việc CHẤM PHÁT ÂM.
//
// Cả ba thứ dưới đây mặc định BẬT trong trình duyệt vì chúng được thiết kế cho
// gọi thoại — và cả ba đều phá hoại việc chấm phát âm:
//
//  - noiseSuppression: nhận diện "nhiễu" bằng đặc trưng phổ băng rộng, năng
//    lượng thấp, giống nhiễu trắng. Đó ĐÚNG là mô tả của phụ âm xát tiếng Trung
//    (s, sh, x, c, ch, q, f, h). Nó bóp chính cái mà iFLYTEK cần nghe để chấm
//    thanh mẫu.
//  - autoGainControl: dò gain liên tục với hằng số thời gian chậm. Với một câu
//    chỉ dài 2-3 giây thì AGC vẫn đang dò suốt cả câu, làm méo tương quan năng
//    lượng giữa các âm tiết -> hỏng điểm thanh điệu và điểm đầy đủ.
//  - echoCancellation: trừ tín hiệu mà chính máy đang phát ra khỏi mic. Có
//    video mẫu phát ngay cột bên cạnh; lệch pha một chút là AEC cắt cả giọng
//    người dùng.
//
// ĐÁNH ĐỔI: tắt echoCancellation nghĩa là nếu học viên bật loa ngoài và cho
// video mẫu chạy TRONG LÚC đang ghi âm thì tiếng video sẽ lọt vào mic. Luồng UI
// hiện tại tách riêng nút nghe mẫu và nút ghi âm nên rủi ro thấp. Nếu về sau
// thấy có vấn đề, bật lại RIÊNG echoCancellation ở đây là đủ — đừng bật lại
// noiseSuppression/autoGainControl.
const MIC_CONSTRAINTS = {
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
}

// Timeout tổng cho một phiên chấm — KHÔNG cố định, mà tính theo độ dài câu.
// Lý do: người đọc là HỌC VIÊN mới học, đọc chậm hơn người bản xứ nhiều (có
// ngập ngừng, đọc lại). Câu càng dài càng cần nhiều thời gian: vừa để đọc,
// vừa để backend stream audio lên iFLYTEK + iFLYTEK chấm + trả kết quả. Timeout
// 20s cố định trước đây làm câu trên ~20 chữ gần như luôn bị "quá thời gian".
//
//   BASE_OVERHEAD: phần cố định (mở WS + handshake + gửi audio + iFLYTEK chấm + mạng)
//   READ_MS_PER_CHAR: thời gian đọc ước tính cho mỗi chữ Hán (học viên đọc chậm)
//   MIN/MAX: sàn và trần để không quá ngắn, cũng không treo vô hạn.
const BASE_OVERHEAD_MS = 15000
const READ_MS_PER_CHAR = 900
const MIN_TIMEOUT_MS = 25000
const MAX_TIMEOUT_MS = 90000

// Đếm số chữ Hán trong câu (mỗi chữ Hán = 1 âm tiết cần đọc).
function countHanzi(text) {
    const matches = (text || '').match(/[\u4e00-\u9fff]/g)
    return matches ? matches.length : 0
}

// Tính timeout hợp lý cho câu mẫu học viên sắp đọc.
function computeTimeout(referenceText) {
    const chars = countHanzi(referenceText)
    const raw = BASE_OVERHEAD_MS + chars * READ_MS_PER_CHAR
    return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, raw))
}

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

// Float32 [-1,1] -> Int16 PCM. KHÔNG đổi sample rate — việc hạ tần số lấy mẫu
// đã được xử lý ở tầng audio graph (xem createCaptureGraph bên dưới).
function floatToPCM16(float32, length) {
    const n = length === undefined ? float32.length : length
    const out = new Int16Array(n)
    for (let i = 0; i < n; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]))
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return out
}

// Bộ hạ sample DỰ PHÒNG, chỉ dùng khi trình duyệt không cho tạo AudioContext ở
// 16kHz.
//
// BẢN CŨ SAI Ở ĐÂY: nó decimate trần (48k -> 16k thì cứ 3 mẫu lấy 1, vứt 2) mà
// KHÔNG lọc thông thấp trước. Mọi năng lượng trên 8kHz không biến mất, nó gập
// ngược xuống dải 0-8kHz thành tần số giả: 10kHz -> 6kHz, 12kHz -> 4kHz,
// 14kHz -> 2kHz. Đúng dải quyết định của thanh mẫu (s/sh/x/c/ch/q phân biệt
// nhau bằng hình dạng phổ 3-16kHz) và của vận mẫu (formant F2/F3 ở 1.5-3.5kHz).
// Kết quả là iFLYTEK báo sai thanh mẫu/vận mẫu với người đọc chuẩn.
//
// Bản này giữ pha lấy mẫu LIÊN TỤC giữa các block (bản cũ reset về 0 mỗi block,
// gây gián đoạn tuần hoàn khi tỉ lệ không phải số nguyên, vd. 44.1kHz) và lấy
// trung bình cửa sổ thay vì lấy mẫu điểm.
function createDecimator(inRate) {
    const ratio = inRate / TARGET_RATE
    let phase = 0 // vị trí lấy mẫu còn dư, mang sang block kế tiếp

    return function decimate(input) {
        const outLen = Math.max(0, Math.ceil((input.length - phase) / ratio))
        const out = new Float32Array(outLen)
        let n = 0
        for (let pos = phase; pos < input.length; pos += ratio) {
            // Trung bình các mẫu trong cửa sổ [pos, pos+ratio) — thêm một tầng
            // lọc nhẹ nữa và tránh phụ thuộc vào đúng một mẫu đơn lẻ.
            const start = Math.floor(pos)
            const end = Math.min(input.length, Math.floor(pos + ratio))
            let sum = 0
            let count = 0
            for (let i = start; i < end; i++) {
                sum += input[i]
                count++
            }
            out[n++] = count > 0 ? sum / count : input[start] || 0
            phase = pos + ratio
        }
        phase -= input.length
        if (phase < 0) phase = 0
        return { data: out, length: n }
    }
}

export function isSpeechSupported() {
    return typeof window !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

// Dựng audio graph để thu về PCM 16kHz ĐÚNG CÁCH.
//
// Cách tốt nhất: tạo thẳng AudioContext ở 16kHz. Khi đó MediaStreamAudioSourceNode
// sẽ được CHÍNH trình duyệt hạ tần số lấy mẫu, bằng bộ resample có lọc chống
// aliasing đàng hoàng — thứ mà code tay của bản cũ thiếu. Ta chỉ còn việc đổi
// float sang int16, không đụng gì tới tần số nữa.
//
// Nhánh dự phòng (trình duyệt từ chối 16kHz): giữ context ở tần số gốc, tự chèn
// chuỗi 4 bộ lọc thông thấp biquad (48 dB/octave) rồi mới decimate. Không sắc
// bằng resampler của trình duyệt và hy sinh một ít dải 6-8kHz, nhưng vẫn chặn
// được phần gập ngược tệ nhất (10-16kHz gập xuống 0-6kHz).
async function createCaptureGraph(stream, onSamples) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext

    let audioCtx = null
    try {
        audioCtx = new AudioCtor({ sampleRate: TARGET_RATE })
    } catch (e) {
        audioCtx = new AudioCtor()
    }
    // Một số trình duyệt nhận tham số nhưng lặng lẽ bỏ qua -> phải kiểm tra lại
    // tần số thật của context chứ không tin vào tham số đã truyền.
    if (audioCtx.sampleRate !== TARGET_RATE) {
        try {
            if (audioCtx.state !== 'closed') audioCtx.close().catch(() => { })
        } catch (e) { /* bỏ qua */ }
        audioCtx = new AudioCtor()
    }

    const nativeRate = audioCtx.sampleRate
    const needsResample = nativeRate !== TARGET_RATE

    const source = audioCtx.createMediaStreamSource(stream)

    // Đầu chuỗi lọc — nếu không cần resample thì lấy thẳng source.
    let tail = source
    const filters = []
    if (needsResample) {
        for (let i = 0; i < ANTIALIAS_STAGES; i++) {
            const f = audioCtx.createBiquadFilter()
            f.type = 'lowpass'
            f.frequency.value = ANTIALIAS_CUTOFF_HZ
            f.Q.value = Math.SQRT1_2 // Butterworth, không gợn ở dải thông
            tail.connect(f)
            tail = f
            filters.push(f)
        }
    }

    // ---- Node thu âm: ưu tiên AudioWorklet, lùi về ScriptProcessor ----
    //
    // AudioWorklet chạy trên luồng âm thanh riêng nên không bị React/animation
    // cướp thời gian -> không rơi block. ScriptProcessor chạy trên main thread
    // và rơi block im lặng khi máy bận (thấy rõ trên điện thoại tầm trung).
    // Giữ ScriptProcessor làm phương án lùi cho trình duyệt quá cũ.
    let processor = null
    let captureMode = ''

    if (audioCtx.audioWorklet) {
        try {
            await audioCtx.audioWorklet.addModule(PCM_WORKLET_URL)
            processor = new AudioWorkletNode(audioCtx, 'pcm-recorder', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [1],
                channelCount: 1,
            })
            processor.port.onmessage = (e) => onSamples(e.data)
            captureMode = 'worklet'
        } catch (e) {
            processor = null // trình duyệt có audioWorklet nhưng nạp module lỗi
        }
    }

    if (!processor) {
        processor = audioCtx.createScriptProcessor(BLOCK_SIZE, 1, 1)
        processor.onaudioprocess = (e) => {
            // Bắt buộc sao chép: inputBuffer được tái sử dụng cho block sau.
            onSamples(new Float32Array(e.inputBuffer.getChannelData(0)))
        }
        captureMode = 'scriptprocessor'
    }

    tail.connect(processor)

    // Đầu ra của node thu phải đi tới destination thì mới được đưa vào đồ thị
    // kết xuất: Web Audio kéo dữ liệu TỪ destination ngược lên, node không nằm
    // trên đường đi tới destination có thể không bao giờ được chạy (chắc chắn
    // đúng với ScriptProcessorNode; với AudioWorkletNode thì tuỳ trình duyệt).
    //
    // Nhưng nối thẳng ra loa thì có nguy cơ vọng tiếng, nên chèn một GainNode
    // gain = 0 ở giữa: node vẫn được kết xuất, mà tuyệt đối không phát ra tiếng
    // dù trình duyệt có xử lý output buffer kiểu gì.
    const silentSink = audioCtx.createGain()
    silentSink.gain.value = 0
    processor.connect(silentSink)
    silentSink.connect(audioCtx.destination)

    const decimate = needsResample ? createDecimator(nativeRate) : null

    return { audioCtx, source, processor, filters, silentSink, decimate, nativeRate, captureMode }
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
export function assessPronunciation(referenceText, { onListening, onLevel, context = {} } = {}) {
    let ws = null
    let audioCtx = null
    let processor = null
    let source = null
    let filters = []
    let silentSink = null
    let stream = null
    let stopMeter = null
    let recording = false
    let settled = false
    let timeoutId = null
    let flushId = null

    // Giữ lại BẢN SAO của audio đã gửi đi, để học viên nghe lại giọng mình.
    // Dữ liệu này vốn đã đi qua tay ta rồi (ta tự tính ra từng mẫu PCM để gửi
    // lên server) — "ghi âm" chỉ là giữ lại thay vì vứt đi, không tốn thêm
    // băng thông và không cần MediaRecorder.
    let recordedChunks = []
    let recordedSamples = 0
    // Trần an toàn khớp với trần phía máy chủ (90 giây ở 16kHz).
    const MAX_RECORDED_SAMPLES = TARGET_RATE * 90

    // Thông tin kỹ thuật của lần thu này, gửi kèm để lưu vào lịch sử — chính là
    // thứ giúp trả lời "vì sao máy này chấm khác máy kia".
    const captureInfo = {}

    const cleanupAudio = () => {
        recording = false
        if (stopMeter) {
            try {
                stopMeter()
            } catch (e) { /* bỏ qua */ }
            stopMeter = null
        }
        try {
            if (processor) {
                // ScriptProcessorNode dùng onaudioprocess, AudioWorkletNode dùng
                // port.onmessage — gỡ cả hai, node nào không có thì bỏ qua.
                processor.onaudioprocess = null
                if (processor.port) processor.port.onmessage = null
                processor.disconnect()
            }
        } catch (e) { /* bỏ qua */ }
        filters.forEach((f) => {
            try {
                f.disconnect()
            } catch (e) { /* bỏ qua */ }
        })
        filters = []
        try {
            if (silentSink) silentSink.disconnect()
        } catch (e) { /* bỏ qua */ }
        silentSink = null
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

    // Tắt stream vừa được cấp trong trường hợp phiên đã kết thúc trước khi kịp
    // dựng audio graph (lúc đó chưa có gì để cleanupAudio tháo).
    const abandonStream = () => {
        try {
            if (stream) stream.getTracks().forEach((t) => t.stop())
        } catch (e) { /* bỏ qua */ }
        stream = null
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
            // Hủy luôn nhịp chờ đẩy nốt đuôi câu (nếu đang chờ) để không có
            // lệnh 'end' lạc gửi đi sau khi phiên đã kết thúc.
            if (flushId) clearTimeout(flushId)
            flushId = null
            cleanupAudio()
            closeWs()
            fn(payload)
        }


        // Dựng file WAV từ những mẩu PCM đã giữ lại. Trả kèm vào kết quả để
        // SpeakingPracticeModal cho học viên bấm nghe lại ngay.
        // LƯU Ý: blob này chỉ nằm trong bộ nhớ trình duyệt — tải lại trang là
        // mất. Việc lưu lâu dài (nếu có) do máy chủ đảm nhiệm và bị khống chế
        // bởi cờ PRACTICE_HISTORY_ENABLED.
        const buildRecording = () => {
            if (recordedChunks.length === 0) return { audioBlob: null, audioUrl: '' }
            try {
                const blob = encodeWav(recordedChunks, TARGET_RATE)
                return { audioBlob: blob, audioUrl: URL.createObjectURL(blob) }
            } catch (e) {
                return { audioBlob: null, audioUrl: '' }
            }
        }

        // Lớp bảo vệ: timeout tổng — không bao giờ đơ vĩnh viễn.
        // Tính theo độ dài câu (câu dài được nhiều thời gian hơn).
        const timeoutMs = computeTimeout(referenceText)
        timeoutId = setTimeout(() => {
            finish(reject, 'Quá thời gian chờ xử lý. Câu hơi dài, bạn thử đọc lại và nói liền mạch hơn một chút nhé.')
        }, timeoutMs)

        const wsUrl = resolveWsUrl()
        try {
            ws = new WebSocket(wsUrl)
        } catch (e) {
            finish(reject, 'Không kết nối được máy chủ chấm điểm.')
            return
        }
        ws.binaryType = 'arraybuffer'

        ws.onopen = async () => {
            // Token học viên đi trong PAYLOAD chứ không phải query string của
            // URL WebSocket: URL bị ghi vào access log của Nginx, payload thì không.
            ws.send(
                JSON.stringify({
                    type: 'start',
                    token: getStudentToken(),
                    text: referenceText,
                    context,
                })
            )

            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS })
            } catch (e) {
                finish(reject, 'Không truy cập được microphone. Kiểm tra quyền trình duyệt.')
                return
            }
            // Phiên có thể đã kết thúc (timeout/lỗi/người dùng đóng modal) TRONG
            // lúc chờ cấp quyền mic. Khi đó cleanupAudio() đã chạy xong từ trước
            // và không biết gì về stream vừa mới được cấp — phải tự tắt ở đây,
            // nếu không đèn báo mic của trình duyệt sẽ sáng mãi.
            if (settled) {
                abandonStream()
                return
            }

            // Ghi lại constraint mà trình duyệt THỰC SỰ áp dụng (không phải cái
            // ta yêu cầu). Nếu ta xin noiseSuppression:false mà nó trả về true
            // thì biết ngay nền tảng đã đè lên — thông tin vàng khi chẩn đoán
            // "cùng một câu, máy này chấm khác máy kia".
            try {
                const track = stream.getAudioTracks()[0]
                const settings = track ? track.getSettings() : {}
                captureInfo.micLabel = track ? track.label : ''
                captureInfo.micSampleRate = settings.sampleRate ?? null
                captureInfo.echoCancellation = settings.echoCancellation ?? null
                captureInfo.noiseSuppression = settings.noiseSuppression ?? null
                captureInfo.autoGainControl = settings.autoGainControl ?? null
            } catch (e) { /* bỏ qua, chỉ là thông tin chẩn đoán */ }

            // Khai báo TRƯỚC handleSamples: callback được truyền vào
            // createCaptureGraph và có thể bị gọi ngay khi node vừa nối, tức là
            // trước lúc lệnh gán bên dưới chạy xong. Khai báo sau sẽ rơi vào
            // vùng chết (TDZ) của let và ném ReferenceError.
            let graph = null

            // Nhận từng mẩu mẫu thô từ node thu (worklet hoặc scriptprocessor),
            // hạ tần số nếu cần, gửi lên server VÀ giữ lại một bản.
            const handleSamples = (input) => {
                if (!recording || !input || input.length === 0) return
                let pcm
                if (graph && graph.decimate) {
                    const { data, length } = graph.decimate(input)
                    pcm = floatToPCM16(data, length)
                } else {
                    pcm = floatToPCM16(input)
                }
                if (pcm.length === 0) return
                if (ws && ws.readyState === WebSocket.OPEN) ws.send(pcm.buffer)
                if (recordedSamples + pcm.length <= MAX_RECORDED_SAMPLES) {
                    recordedChunks.push(pcm)
                    recordedSamples += pcm.length
                }
            }

            try {
                graph = await createCaptureGraph(stream, handleSamples)
            } catch (e) {
                abandonStream()
                finish(reject, 'Không khởi tạo được bộ thu âm trên trình duyệt này.')
                return
            }
            if (settled) {
                try {
                    graph.audioCtx.close().catch(() => { })
                } catch (err) { /* bỏ qua */ }
                abandonStream()
                return
            }

            captureInfo.captureMode = graph.captureMode
            // Tần số THẬT của AudioContext — khác với tần số của micro ở trên.
            // Đây mới là thứ cho biết nhánh hạ tần số nào đã chạy:
            //   contextSampleRate = 16000 -> trình duyệt tự resample bằng bộ
            //     lọc chuẩn của nó (đường tốt nhất, mong muốn).
            //   contextSampleRate = 44100/48000 -> trình duyệt từ chối 16kHz,
            //     đang chạy nhánh dự phòng biquad + decimator của ta (kém sắc
            //     hơn, hy sinh một phần dải 6-8kHz).
            captureInfo.contextSampleRate = graph.nativeRate
            captureInfo.resampleMode = graph.decimate ? 'fallback-biquad' : 'browser'
            audioCtx = graph.audioCtx
            silentSink = graph.silentSink
            source = graph.source
            processor = graph.processor
            filters = graph.filters

            // AudioContext được tạo bên trong callback của WebSocket, tức là đã
            // ra khỏi ngữ cảnh thao tác người dùng. Đa số trình duyệt vẫn cho
            // chạy nhờ "sticky activation" của cú bấm trước đó, nhưng cứ resume
            // cho chắc — context ở trạng thái suspended thì onaudioprocess không
            // bao giờ chạy và học viên sẽ thấy báo "không nghe thấy tiếng".
            if (audioCtx.state === 'suspended') {
                try {
                    await audioCtx.resume()
                } catch (e) { /* bỏ qua, thử chạy tiếp */ }
            }
            // Lại kiểm tra lần nữa vì resume() là await — phiên có thể đã kết
            // thúc trong lúc chờ. Lần này graph đã dựng nên tháo bằng cleanupAudio.
            if (settled) {
                cleanupAudio()
                return
            }

            // Dải sóng dùng CHUNG audio graph này, không mở microphone lần hai.
            if (typeof onLevel === 'function') {
                stopMeter = attachLevelMeter(audioCtx, source, onLevel)
            }

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
                        ...buildRecording(),
                        rejected: true,
                        rejectReason: reason,
                        rejectMessage: message,
                        spokenText: msg.spokenText || '',
                        words: [],
                        focusWord: null,
                        feedback: '',
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
                    ...buildRecording(),
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
                    // Nhận xét THEO TỪ do máy chủ gom lại (gtc-api/src/lib/wordFeedback.js).
                    // Điểm số vẫn tính ở client như cũ — phần này chỉ thay cách
                    // chỉ lỗi: theo từ thay vì theo từng chữ rời.
                    words: msg.words || [],
                    focusWord: msg.focusWord || null,
                    feedback: msg.feedback || '',
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
    //
    // Bản cũ gọi cleanupAudio() NGAY rồi mới gửi 'end': block audio đang thu dở
    // bị vứt, nên phần đuôi câu không bao giờ tới iFLYTEK và chữ cuối hay bị
    // báo sai. Giờ giữ graph sống thêm TAIL_FLUSH_MS để block cuối chạy nốt
    // (onaudioprocess gửi đồng bộ), rồi mới tháo và gửi 'end'.
    const stop = () => {
        if (settled || flushId) return
        // Bảo worklet đẩy nốt phần đang gom dở. Với AudioWorkletNode thì đây là
        // cách duy nhất lấy được mẩu cuối; ScriptProcessorNode không có port nên
        // bỏ qua, nó đã gửi đồng bộ theo từng block rồi.
        try {
            if (processor && processor.port) processor.port.postMessage('stop')
        } catch (e) { /* bỏ qua */ }

        flushId = setTimeout(() => {
            flushId = null
            cleanupAudio()
            if (ws && ws.readyState === WebSocket.OPEN) {
                // Gửi kèm thông tin thiết bị để máy chủ lưu vào lịch sử luyện nói.
                ws.send(JSON.stringify({ type: 'end', capture: captureInfo }))
            }
        }, TAIL_FLUSH_MS)
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