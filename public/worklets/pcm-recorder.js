/**
 * AudioWorkletProcessor — thu âm thanh trên LUỒNG ÂM THANH RIÊNG.
 *
 * VÌ SAO CẦN FILE NÀY:
 * ScriptProcessorNode (thứ được dùng trước đây) chạy callback trên main thread
 * — đúng luồng đang chạy React, tính layout, vẽ animation. Phần cứng âm thanh
 * thì không chờ ai: cứ đều đặn đổ ra một block mới. Main thread bận quá lâu thì
 * block đó bị ghi đè và MẤT IM LẶNG — không exception, không cảnh báo, chỉ còn
 * audio khuyết lỗ chỗ và iFLYTEK báo "đọc thiếu".
 *
 * AudioWorklet chạy trên luồng âm thanh riêng, độ ưu tiên thời gian thực. React
 * có render lại bao nhiêu lần cũng không cướp được thời gian của nó.
 *
 * LƯU Ý KHI SỬA FILE NÀY:
 * File được nạp qua audioWorklet.addModule() nên nó chạy trong AudioWorkletGlobalScope
 * — KHÔNG có window, document, không import được module khác. Phải là JS thuần,
 * đứng một mình.
 *
 * VÌ SAO NẰM TRONG public/ CHỨ KHÔNG PHẢI src/:
 * Thử đặt trong src/ và import bằng `?url` thì Vite nội tuyến file thành
 * data:text/javascript URL (vì nhỏ hơn ngưỡng assetsInlineLimit 4KB). Cách đó
 * dễ vỡ: nhiều chính sách CSP chặn `data:` trong script-src, và hành vi sẽ tự
 * đổi khi file này lớn quá 4KB. Đặt trong public/ thì Vite chép nguyên xi, luôn
 * là một file thật ở đường dẫn cố định, giống nhau giữa dev và production.
 */

// Số frame gom lại trước khi gửi về main thread. Worklet nhận từng khối 128
// frame; gom 1024 frame (~64ms ở 16kHz) rồi mới gửi một lần để giảm số lần
// postMessage, nhưng vẫn đủ nhỏ để đuôi câu không bị cắt khi bấm "Dừng".
const CHUNK_FRAMES = 1024

class PcmRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super()
        this._buffer = new Float32Array(CHUNK_FRAMES)
        this._offset = 0
        this._recording = true

        this.port.onmessage = (e) => {
            if (e.data === 'stop') {
                this._flush() // đẩy nốt phần dở dang trước khi dừng hẳn
                this._recording = false
            }
        }
    }

    _flush() {
        if (this._offset === 0) return
        const out = this._buffer.slice(0, this._offset)
        // Chuyển quyền sở hữu bộ nhớ sang main thread thay vì sao chép.
        this.port.postMessage(out, [out.buffer])
        this._offset = 0
    }

    process(inputs) {
        if (!this._recording) return false // trả false -> node tự kết thúc

        const input = inputs[0]
        // Mic chưa sẵn sàng hoặc vừa bị ngắt: giữ node sống, chờ tiếp.
        if (!input || input.length === 0 || !input[0]) return true

        const channel = input[0]
        for (let i = 0; i < channel.length; i++) {
            this._buffer[this._offset++] = channel[i]
            if (this._offset === CHUNK_FRAMES) this._flush()
        }
        return true
    }
}

registerProcessor('pcm-recorder', PcmRecorderProcessor)
