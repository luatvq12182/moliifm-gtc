// Đo mức âm lượng micro để vẽ dải sóng trong lúc ghi âm.
//
// TRƯỚC ĐÂY file này tự gọi getUserMedia riêng một lần nữa, song song với luồng
// ghi âm chấm điểm. Đó là nguồn lỗi: Chrome áp khối xử lý audio (AEC/khử
// nhiễu/AGC) ở cấp THIẾT BỊ, nên khi mic đã được mở sẵn bởi request thứ nhất
// thì constraint của request thứ hai có thể bị bỏ qua — luồng chấm điểm không
// nhận được cấu hình mà nó yêu cầu. Giờ meter dùng CHUNG audio graph với luồng
// ghi âm, không mở thiết bị lần hai nữa.
//
// Gắn vào một AudioContext + node nguồn đã có sẵn. Trả về hàm stop().
export function attachLevelMeter(audioCtx, sourceNode, onLevel, { intervalMs = 60 } = {}) {
    let timerId = null
    let analyser = null
    let lastSent = -1

    try {
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        // Chỉ "nghe ké" để đo, KHÔNG nối tiếp vào chuỗi xử lý — analyser nằm ở
        // nhánh cụt nên không ảnh hưởng gì tới audio gửi đi chấm điểm.
        sourceNode.connect(analyser)
    } catch (e) {
        return function noop() { }
    }

    const data = new Uint8Array(analyser.frequencyBinCount)

    // Dùng setInterval ~16 lần/giây thay vì requestAnimationFrame 60 lần/giây.
    // Mỗi lần gọi onLevel là một lần React render lại cả modal; ở 60fps việc đó
    // chiếm main thread, mà ScriptProcessorNode của luồng ghi âm cũng chạy trên
    // main thread — main thread bận thì block audio bị rơi. 16fps đủ mượt cho
    // một cột sóng và giảm 4 lần số lần render.
    timerId = setInterval(() => {
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        const level = Math.min(1, sum / data.length / 100)
        // Bỏ qua nếu thay đổi không đáng kể -> tránh render thừa.
        const rounded = Math.round(level * 50) / 50
        if (rounded !== lastSent) {
            lastSent = rounded
            onLevel(rounded)
        }
    }, intervalMs)

    return function stop() {
        if (timerId) clearInterval(timerId)
        timerId = null
        try {
            if (analyser) analyser.disconnect()
        } catch (e) { /* bỏ qua */ }
        analyser = null
    }
}
