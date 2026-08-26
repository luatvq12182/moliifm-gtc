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

export function isSpeechSupported() {
    // Azure TTS chạy được ở mọi trình duyệt hiện đại; chỉ cần có key.
    return Boolean(import.meta.env.VITE_AZURE_KEY && import.meta.env.VITE_AZURE_REGION)
}

// Tổng hợp text thành object URL, có cache.
function synthesizeToUrl(chinese) {
    if (audioCache.has(chinese)) return Promise.resolve(audioCache.get(chinese))
    if (pendingSynthesis.has(chinese)) return pendingSynthesis.get(chinese)

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

        synthesizer.speakTextAsync(
            chinese,
            (result) => {
                synthesizer.close()
                if (!result || !result.audioData || result.audioData.byteLength === 0) {
                    reject(new Error('Azure không trả về dữ liệu âm thanh.'))
                    return
                }
                const url = URL.createObjectURL(new Blob([result.audioData], { type: 'audio/wav' }))
                audioCache.set(chinese, url)
                resolve(url)
            },
            (err) => {
                synthesizer.close()
                reject(err)
            }
        )
    }).finally(() => {
        pendingSynthesis.delete(chinese)
    })

    pendingSynthesis.set(chinese, task)
    return task
}

/**
 * Tổng hợp sẵn audio cho một từ mà KHÔNG phát, để lần bấm đầu tiên phát ngay
 * lập tức thay vì chờ 0.5-1.2 giây gọi Azure.
 *
 * Dùng cho từ mà học viên nhiều khả năng sẽ bấm nhất (từ đang cần luyện). Lỗi
 * thì im lặng bỏ qua — đây chỉ là tối ưu, không được làm vỡ luồng chính.
 */
export function prefetchChinese(text) {
    const chinese = extractChinese(text)
    if (!chinese || !isSpeechSupported()) return
    synthesizeToUrl(chinese).catch(() => { })
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
export function speakChinese(text, { onStart, onEnd } = {}) {
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

    return synthesizeToUrl(chinese)
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
