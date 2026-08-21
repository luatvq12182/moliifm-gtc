/**
 * Ghép các mẩu PCM 16-bit đã thu thành một file WAV ngay trong trình duyệt,
 * để học viên nghe lại giọng mình.
 *
 * Điểm mấu chốt: dữ liệu này VỐN ĐÃ đi qua tay chúng ta. iflytekSpeech.js tính
 * ra từng mẫu PCM rồi gửi lên server và quên luôn. "Ghi âm" chẳng qua là giữ
 * lại thay vì vứt đi — không cần MediaRecorder, không cần thư viện, và quan
 * trọng nhất: cho ra CÙNG MỘT ĐỊNH DẠNG trên mọi trình duyệt (MediaRecorder
 * thì Chrome ra WebM, Safari ra MP4 — mỗi nơi một kiểu).
 */

const BITS_PER_SAMPLE = 16
const CHANNELS = 1

function writeAscii(view, offset, text) {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
}

/**
 * chunks: mảng các Int16Array (mỗi phần tử là một block đã thu).
 * Trả về Blob audio/wav phát được bằng thẻ <audio>.
 */
export function encodeWav(chunks, sampleRate) {
    const totalSamples = chunks.reduce((sum, c) => sum + c.length, 0)
    const dataBytes = totalSamples * (BITS_PER_SAMPLE / 8)
    const buffer = new ArrayBuffer(44 + dataBytes)
    const view = new DataView(buffer)

    const byteRate = (sampleRate * CHANNELS * BITS_PER_SAMPLE) / 8
    const blockAlign = (CHANNELS * BITS_PER_SAMPLE) / 8

    writeAscii(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataBytes, true)
    writeAscii(view, 8, 'WAVE')
    writeAscii(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // độ dài khối fmt
    view.setUint16(20, 1, true) // 1 = PCM không nén
    view.setUint16(22, CHANNELS, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, BITS_PER_SAMPLE, true)
    writeAscii(view, 36, 'data')
    view.setUint32(40, dataBytes, true)

    let offset = 44
    chunks.forEach((chunk) => {
        for (let i = 0; i < chunk.length; i++) {
            view.setInt16(offset, chunk[i], true)
            offset += 2
        }
    })

    return new Blob([buffer], { type: 'audio/wav' })
}
