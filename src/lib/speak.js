import * as SDK from 'microsoft-cognitiveservices-speech-sdk'

// Đọc mẫu chữ Hán bằng Azure Neural TTS (giọng tự nhiên, đúng thanh điệu).
// Cách 1: gọi thẳng Azure mỗi lần đọc — đơn giản để demo. Sau này nếu khách
// duyệt sẽ nâng cấp: backend tạo + cache file mp3 để đỡ tốn phí gọi lặp.

const VOICE = 'zh-CN-XiaoxiaoNeural' // giọng nữ, phổ thông chuẩn, ấm

let currentPlayer = null

export function isSpeechSupported() {
    // Azure TTS chạy được ở mọi trình duyệt hiện đại; chỉ cần có key.
    return Boolean(import.meta.env.VITE_AZURE_KEY && import.meta.env.VITE_AZURE_REGION)
}

export function speakChinese(text) {
    if (!text) return

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
        text,
        () => {
            synthesizer.close()
        },
        (err) => {
            console.warn('[speak] Lỗi đọc mẫu:', err)
            synthesizer.close()
        }
    )
}