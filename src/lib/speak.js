import * as SDK from 'microsoft-cognitiveservices-speech-sdk'

// Đọc mẫu chữ Hán bằng Azure Neural TTS (giọng tự nhiên, đúng thanh điệu).
// Cách 1: gọi thẳng Azure mỗi lần đọc — đơn giản để demo. Sau này nếu khách
// duyệt sẽ nâng cấp: backend tạo + cache file mp3 để đỡ tốn phí gọi lặp.

const VOICE = 'zh-CN-XiaoxiaoNeural' // giọng nữ, phổ thông chuẩn, ấm

let currentPlayer = null

// Chỉ giữ lại phần ĐỌC ĐƯỢC bằng tiếng Trung. Admin đôi khi ghi thêm nhãn
// tiếng Việt vào ô chữ Hán để phân biệt vai trò của từ, ví dụ:
//   "Động từ: 给你"  /  "Giới từ: 送给你"
// Nếu đưa nguyên chuỗi cho TTS, nó sẽ đọc cả "Động từ", "Giới từ"... Hàm này
// lọc bỏ chữ Latin/tiếng Việt, chỉ giữ chữ Hán và dấu câu tiếng Trung (để đọc
// ngắt tự nhiên). Trả về '' nếu không còn chữ Hán nào.
function extractChinese(text) {
    if (!text) return ''
    // Giữ: khối chữ Hán (CJK) + dấu câu/ký hiệu toàn hình tiếng Trung.
    //   [\u4e00-\u9fff]      Hán tự thông dụng
    //   [\u3000-\u303f]      dấu câu CJK (。、《》…)
    //   [\uff00-\uffef]      ký tự toàn hình (？！：，...)
    const kept = text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g)
    return kept ? kept.join('').trim() : ''
}

export function isSpeechSupported() {
    // Azure TTS chạy được ở mọi trình duyệt hiện đại; chỉ cần có key.
    return Boolean(import.meta.env.VITE_AZURE_KEY && import.meta.env.VITE_AZURE_REGION)
}

export function speakChinese(text) {
    // Lọc bỏ nhãn tiếng Việt/Latin, chỉ đọc phần chữ Hán.
    const chinese = extractChinese(text)
    if (!chinese) return // không có chữ Hán -> không đọc gì

    const AZURE_KEY = import.meta.env.VITE_AZURE_KEY
    const AZURE_REGION = import.meta.env.VITE_AZURE_REGION
    if (!AZURE_KEY || !AZURE_REGION) {
        console.warn('[speak] Chưa cấu hình VITE_AZURE_KEY / VITE_AZURE_REGION')
        return
    }

    // Dừng audio đang đọc dở (nếu người dùng bấm loa liên tục).
    if (currentPlayer) {
        try {
            currentPlayer.pause()
        } catch (e) {
            /* bỏ qua */
        }
        currentPlayer = null
    }

    const speechConfig = SDK.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION)
    speechConfig.speechSynthesisVoiceName = VOICE

    // Dùng player riêng để có thể dừng giữa chừng khi bấm câu khác.
    const player = new SDK.SpeakerAudioDestination()
    currentPlayer = player
    const audioConfig = SDK.AudioConfig.fromSpeakerOutput(player)

    const synthesizer = new SDK.SpeechSynthesizer(speechConfig, audioConfig)

    synthesizer.speakTextAsync(
        chinese,
        () => {
            synthesizer.close()
        },
        (err) => {
            console.warn('[speak] Lỗi đọc mẫu:', err)
            synthesizer.close()
        }
    )
}