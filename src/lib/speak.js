import * as SDK from 'microsoft-cognitiveservices-speech-sdk'

// Đọc mẫu chữ Hán bằng Azure Neural TTS (giọng tự nhiên, đúng thanh điệu).
//
// TỔNG HỢP MỘT LẦN RỒI CACHE, thay vì gọi Azure mỗi lần bấm.
// Lý do: học viên bấm nghe ĐI BẤM LẠI cùng một từ để luyện — đó chính là mục
// đích của tính năng. Bản trước phát thẳng ra loa qua SpeakerAudioDestination
// nên không giữ được dữ liệu âm thanh, mỗi lần bấm là một lần gọi API: vừa tốn
// phí, vừa có độ trễ mạng ngay giữa lúc học viên đang luyện.
//
// Bản này tổng hợp ra ArrayBuffer, cache theo nội dung text, rồi phát bằng thẻ
// <audio>. Lần bấm thứ hai trở đi là tức thì và miễn phí.

const VOICE = 'zh-CN-XiaoxiaoNeural' // giọng nữ, phổ thông chuẩn, ấm

// text -> object URL của audio đã tổng hợp. Sống theo vòng đời trang; số từ
// trong một bài học chỉ vài chục nên không cần cơ chế loại bỏ.
const audioCache = new Map()
// text -> Promise đang tổng hợp dở, để hai cú bấm liên tiếp không gọi API 2 lần.
const pendingSynthesis = new Map()

let currentAudio = null

// Chỉ giữ lại phần ĐỌC ĐƯỢC bằng tiếng Trung. Admin đôi khi ghi thêm nhãn
// tiếng Việt vào ô chữ Hán để phân biệt vai trò của từ, ví dụ:
//   "Động từ: 给你"  /  "Giới từ: 送给你"
// Nếu đưa nguyên chuỗi cho TTS, nó sẽ đọc cả "Động từ", "Giới từ"... Hàm này
// lọc bỏ chữ Latin/tiếng Việt, chỉ giữ chữ Hán và dấu câu tiếng Trung (để đọc
// ngắt tự nhiên). Trả về '' nếu không còn chữ Hán nào.
function extractChinese(text) {
    if (!text) return ''
    // Giữ: khối chữ Hán (CJK) + dấu câu/ký hiệu toàn hình tiếng Trung.
    //   \u4e00-\u9fff  Hán tự thông dụng
    //   \u3000-\u303f  dấu câu CJK (。、《》…)
    //   \uff00-\uffef  ký tự toàn hình (？！：，...)
    // Viết dạng \u thay vì gõ thẳng ký tự: trong dải này có dấu cách toàn hình
    // (U+3000), gõ thẳng vào regex thì nhìn không ra và ESLint cũng chặn.
    const kept = text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g)
    return kept ? kept.join('').trim() : ''
}

// Chuyển phiên âm iFLYTEK ("nin2 hao3") sang định dạng SSML của Azure
// ("nin 2 hao 3"). Trả về '' khi KHÔNG CHẮC — chỗ gọi sẽ lùi về đọc chữ thường.
//
// VÌ SAO PHẢI ÉP CÁCH ĐỌC:
// Đưa MỘT chữ Hán rời cho TTS thì nó đọc theo thanh từ điển, mà thanh từ điển
// nhiều khi khác thanh thật trong câu:
//
//   你好   iFLYTEK trả ni2  (biến điệu thanh 3: nǐ hǎo -> ní hǎo)
//          nhưng 你 đứng một mình thì Azure đọc nǐ  -> DẠY SAI THANH
//   不冷/不热  iFLYTEK trả bu4 / bu2 — cùng chữ 不, hai cách đọc
//   好     là chữ đa âm (hǎo "tốt" / hào "thích") -> máy có thể chọn nhầm
//
// Đo được: 很 đọc rời và 很 ép "hen 3" cho ra file âm thanh GIỐNG HỆT TỪNG BYTE,
// trong khi iFLYTEK bảo 很 trong 很好 phải là hen2. Ép bằng phiên âm mà chính
// iFLYTEK đã chấm thì giọng mẫu luôn khớp với thứ máy vừa chấm.
//
// CHỈ ÉP KHI MỌI ÂM TIẾT MANG THANH 1-4.
// Các số 0/5/6/7/8/9 của iFLYTEK KHÔNG suy ra được thanh: đối chiếu với phiên âm
// bài học thì 字 zi9 = míngzi (thanh nhẹ) nhưng 气 qi9 = tiānqì (thanh 4) — cùng
// số 9, hai nghĩa khác nhau. Đoán bừa ở đây là tự tạo ra lỗi phát âm mới, nên
// gặp là bỏ, để Azure tự đọc như trước.
function toSapiPhonemes(pinyin, hanCount) {
    if (!pinyin || !hanCount) return ''
    const syllables = String(pinyin).trim().split(/[\s|]+/).filter(Boolean)
    // Lệch số âm tiết so với số chữ thì mọi phép gán đều sai chỗ -> không ép.
    if (syllables.length !== hanCount) return ''

    const parts = []
    for (const syllable of syllables) {
        const m = syllable.match(/^([a-zü]+)([0-9])$/i)
        if (!m) return ''
        const tone = parseInt(m[2], 10)
        if (tone < 1 || tone > 4) return ''
        // Azure viết ü thành "v" trong bảng phiên âm sapi (nǚ -> "nv 3").
        parts.push(m[1].toLowerCase().replace(/ü/g, 'v') + ' ' + tone)
    }
    return parts.join(' ')
}

function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

// Đếm số chữ Hán, để đối chiếu với số âm tiết trong phiên âm.
function countHanzi(text) {
    return (text.match(/[\u4e00-\u9fff]/g) || []).length
}

export function isSpeechSupported() {
    // Azure TTS chạy được ở mọi trình duyệt hiện đại; chỉ cần có key.
    return Boolean(import.meta.env.VITE_AZURE_KEY && import.meta.env.VITE_AZURE_REGION)
}

// Tổng hợp text thành object URL, có cache.
//
// `ph` là phiên âm sapi đã chuyển đổi; có thì đọc theo đúng phiên âm đó, không
// thì để Azure tự đọc. Khoá cache phải gồm cả `ph`: cùng chữ 不 mà "bu 2" và
// "bu 4" là hai file âm thanh khác nhau, dùng chung khoá thì lần bấm sau lấy
// nhầm bản đã cache của lần trước.
function synthesizeToUrl(chinese, ph) {
    const cacheKey = ph ? chinese + '#' + ph : chinese
    if (audioCache.has(cacheKey)) return Promise.resolve(audioCache.get(cacheKey))
    if (pendingSynthesis.has(cacheKey)) return pendingSynthesis.get(cacheKey)

    const AZURE_KEY = import.meta.env.VITE_AZURE_KEY
    const AZURE_REGION = import.meta.env.VITE_AZURE_REGION

    const task = new Promise((resolve, reject) => {
        const speechConfig = SDK.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION)
        speechConfig.speechSynthesisVoiceName = VOICE
        // Chốt định dạng RIFF WAV: dữ liệu trả về có sẵn header nên thẻ <audio>
        // phát được ngay. Không khai báo thì phải phụ thuộc vào mặc định của
        // SDK, và Blob type ta gán ('audio/wav') có thể không khớp với dữ liệu
        // thật — lúc đó chỉ còn trông chờ trình duyệt tự đoán định dạng.
        speechConfig.speechSynthesisOutputFormat =
            SDK.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm
        // audioConfig = null -> SDK trả dữ liệu âm thanh về cho ta thay vì tự
        // phát ra loa. Đây là điều kiện để cache được.
        const synthesizer = new SDK.SpeechSynthesizer(speechConfig, null)

        const onDone = (result) => {
            synthesizer.close()
            if (!result || !result.audioData || result.audioData.byteLength === 0) {
                reject(new Error('Azure không trả về dữ liệu âm thanh.'))
                return
            }
            const url = URL.createObjectURL(new Blob([result.audioData], { type: 'audio/wav' }))
            audioCache.set(cacheKey, url)
            resolve(url)
        }
        const onFail = (err) => {
            synthesizer.close()
            reject(err)
        }

        if (ph) {
            const ssml =
                `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">` +
                `<voice name="${VOICE}">` +
                `<phoneme alphabet="sapi" ph="${escapeXml(ph)}">${escapeXml(chinese)}</phoneme>` +
                `</voice></speak>`
            synthesizer.speakSsmlAsync(ssml, onDone, onFail)
        } else {
            synthesizer.speakTextAsync(chinese, onDone, onFail)
        }
    }).finally(() => {
        pendingSynthesis.delete(cacheKey)
    })

    pendingSynthesis.set(cacheKey, task)
    return task
}

/**
 * Tổng hợp sẵn audio cho một từ mà KHÔNG phát, để lần bấm đầu tiên phát ngay
 * lập tức thay vì chờ 0.5-1.2 giây gọi Azure.
 *
 * Dùng cho từ mà học viên nhiều khả năng sẽ bấm nhất (từ đang cần luyện). Lỗi
 * thì im lặng bỏ qua — đây chỉ là tối ưu, không được làm vỡ luồng chính.
 */
export function prefetchChinese(text, pinyin) {
    const chinese = extractChinese(text)
    if (!chinese || !isSpeechSupported()) return
    synthesizeToUrl(chinese, toSapiPhonemes(pinyin, countHanzi(chinese))).catch(() => { })
}

export function stopSpeaking() {
    if (currentAudio) {
        try {
            currentAudio.pause()
            currentAudio.currentTime = 0
        } catch (e) { /* bỏ qua */ }
        currentAudio = null
    }
}

/**
 * Đọc mẫu một chuỗi chữ Hán.
 *
 * options.onStart / options.onEnd — để giao diện hiện trạng thái đang phát.
 * onEnd LUÔN được gọi đúng một lần (kể cả khi lỗi hoặc bị cắt ngang), nên chỗ
 * gọi không bao giờ bị kẹt ở trạng thái "đang phát" mãi mãi.
 *
 * Trả về Promise, resolve khi phát xong.
 */
export function speakChinese(text, { pinyin, onStart, onEnd } = {}) {
    const chinese = extractChinese(text)
    if (!chinese) return Promise.resolve()

    if (!isSpeechSupported()) {
        console.warn('[speak] Chưa cấu hình VITE_AZURE_KEY / VITE_AZURE_REGION')
        return Promise.resolve()
    }

    // Dừng audio đang đọc dở (khi người dùng bấm liên tiếp nhiều từ).
    stopSpeaking()

    let finished = false
    const finish = () => {
        if (finished) return
        finished = true
        if (typeof onEnd === 'function') onEnd()
    }

    if (typeof onStart === 'function') onStart()

    return synthesizeToUrl(chinese, toSapiPhonemes(pinyin, countHanzi(chinese)))
        .then((url) => {
            return new Promise((resolve) => {
                const audio = new Audio(url)
                currentAudio = audio
                const done = () => {
                    if (currentAudio === audio) currentAudio = null
                    finish()
                    resolve()
                }
                audio.onended = done
                audio.onerror = done
                // play() resolve khi BẮT ĐẦU phát, không phải khi phát xong —
                // nên phải chờ sự kiện 'ended' mới coi là hoàn tất.
                audio.play().catch(done)
            })
        })
        .catch((err) => {
            console.warn('[speak] Lỗi đọc mẫu:', err)
            finish()
        })
}
