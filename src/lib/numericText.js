/**
 * BẢN SAO CỦA gtc-api/src/lib/numericText.js — giữ hai bên GIỐNG HỆT NHAU.
 *
 * Vì sao phải có bản ở đây: trang quản trị cần cảnh báo NGAY LÚC giảng viên gõ,
 * cho xem trước câu sẽ được gửi cho iFLYTEK dưới dạng nào. Gọi API để hỏi thì
 * vừa chậm vừa thừa, vì đây là hàm thuần, không phụ thuộc dữ liệu gì.
 *
 * Hai bản lệch nhau thì cảnh báo sẽ nói một đằng còn máy chủ làm một nẻo — đúng
 * kiểu lỗi khó lần ra nhất. Bên API có `npm run verify` mục 7 chạy cả hai trên
 * cùng bộ ca và bắt lỗi nếu chúng cho kết quả khác nhau.
 *
 * BỐI CẢNH: iFLYTEK từ chối câu mẫu không có chữ Hán nào. Dòng thoại là số điện
 * thoại trần ("2038559800。") vì thế chết với mã lỗi 8195 ở mọi lượt luyện nói.
 * Cách đọc số phụ thuộc ngữ cảnh (800 là 八百, 215 là 二幺五) nên căn cứ đáng tin
 * là PHIÊN ÂM của chính dòng đó, chứ không phải phỏng đoán.
 */

export const HAS_HAN = /[一-鿿]/

const DIGIT_HAN = {
    0: '零', 1: '一', 2: '二', 3: '三', 4: '四',
    5: '五', 6: '六', 7: '七', 8: '八', 9: '九',
}

// Âm tiết pinyin -> chữ số Hán. Gồm cả 幺 (cách đọc số 1 khi đọc rời từng chữ
// số: số điện thoại, số phòng) và 两 (dùng thay 二 trước lượng từ).
const PINYIN_HAN = {
    ling: '零', yi: '一', yao: '幺', er: '二', liang: '两',
    san: '三', si: '四', wu: '五', liu: '六',
    qi: '七', ba: '八', jiu: '九',
    shi: '十', bai: '百', qian: '千', wan: '万',
}

// Xếp DÀI TRƯỚC để khớp tham lam lấy được cụm dài nhất.
const PINYIN_KEYS = Object.keys(PINYIN_HAN).sort((a, b) => b.length - a.length)

function plainSyllable(token) {
    return token
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/ü/gi, 'v')
        .toLowerCase()
}

// "babai" -> "ba" + "bai" -> 八百. Trả '' nếu có đoạn không phải chữ số.
function splitNumeralToken(plain) {
    let rest = plain
    let out = ''
    while (rest.length > 0) {
        const key = PINYIN_KEYS.find((k) => rest.startsWith(k))
        if (!key) return ''
        out += PINYIN_HAN[key]
        rest = rest.slice(key.length)
    }
    return out
}

export function readingFromPinyin(pinyin) {
    const raw = String(pinyin || '').trim()
    if (!raw) return ''

    // Phiên âm thường có tiền tố tên người nói: "Dàwèi: Èr líng sān..."
    const colon = raw.search(/[:：]/)
    const body = colon > -1 ? raw.slice(colon + 1) : raw

    const tokens = body
        .split(/[^A-Za-zÀ-ÿüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀǍĒĚĪǏŌǑŪǓǕǗǙǛ']+/)
        .filter(Boolean)
    if (tokens.length === 0) return ''

    const out = []
    for (const token of tokens) {
        const han = splitNumeralToken(plainSyllable(token))
        if (!han) return ''
        out.push(han)
    }
    return out.join('')
}

export function toSpeakableText(text, pinyin) {
    const raw = String(text || '').trim()

    if (HAS_HAN.test(raw)) return { text: raw, changed: false, source: '' }
    if (!/[0-9]/.test(raw)) return { text: '', changed: false, source: '' }

    const fromPinyin = readingFromPinyin(pinyin)
    if (fromPinyin) return { text: fromPinyin, changed: true, source: 'pinyin' }

    const digits = raw.match(/[0-9]/g) || []
    return {
        text: digits.map((d) => DIGIT_HAN[d]).join(''),
        changed: true,
        source: 'digit',
    }
}
