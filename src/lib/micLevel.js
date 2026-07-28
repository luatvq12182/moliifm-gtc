// Đo mức âm lượng micro theo thời gian thực để vẽ dải sóng trong lúc ghi âm
// — độc lập với luồng ghi âm chính của Azure SDK. Trình duyệt cho phép nhiều
// "consumer" cùng đọc 1 thiết bị mic cùng lúc nên không xung đột với recognizer.
export function startMicLevelMeter(onLevel) {
    let stream
    let audioCtx
    let analyser
    let rafId
    let stopped = false

    navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => {
            if (stopped) {
                s.getTracks().forEach((t) => t.stop())
                return
            }
            stream = s
            audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            const source = audioCtx.createMediaStreamSource(stream)
            analyser = audioCtx.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)

            const data = new Uint8Array(analyser.frequencyBinCount)
            const tick = () => {
                analyser.getByteFrequencyData(data)
                const avg = data.reduce((sum, v) => sum + v, 0) / data.length
                onLevel(Math.min(1, avg / 100))
                rafId = requestAnimationFrame(tick)
            }
            tick()
        })
        .catch(() => {
            // Không lấy được stream riêng để đo mức (vd. trình duyệt chặn) — bỏ
            // qua, dải sóng sẽ đứng yên nhưng phần ghi âm chính qua Azure vẫn
            // hoạt động bình thường, không phụ thuộc vào file này.
        })

    return function stop() {
        stopped = true
        if (rafId) cancelAnimationFrame(rafId)
        if (stream) stream.getTracks().forEach((t) => t.stop())
        if (audioCtx) audioCtx.close()
    }
}