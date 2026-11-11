/**
 * Đáp án đề luyện thi — tiện ích cho trang soạn đề (khớp lib/examTest.js ở API).
 */

export const SECTION_LABEL = { listening: "Nghe", reading: "Đọc", writing: "Viết" };
export const TYPE_LABEL = { choice: "Chọn đáp án", text: "Viết đáp án", sentence: "Đặt câu (AI chấm)" };

/** Số câu -> nhóm của nó. */
export function questionMap(groups) {
  const map = new Map();
  for (const g of groups) for (let n = g.from; n <= g.to; n++) map.set(n, g);
  return map;
}

/** Câu đã có đáp án chưa (đặt câu: có từ bắt buộc là đủ). */
export const isAnswered = (g, it) => (g.type === "sentence" ? Boolean(it?.keyword?.trim()) : Boolean(it?.answer?.trim()));

/**
 * Dán nhanh đáp án. Nhận hai kiểu:
 *  - có số câu: "1.B 2.A 3 C", "61. 汽 62 图", mỗi câu một dòng cũng được
 *    (câu đặt câu: chữ sau số câu là từ bắt buộc)
 *  - chỉ một dãy chữ cái "BACDF…": điền lần lượt vào các câu chọn đáp án,
 *    bắt đầu từ câu chọn đáp án đầu tiên
 *
 * Trả { items: Map(no -> item), applied, errors: [chuỗi] }. Không sửa `items` cũ.
 */
export function parseAnswerPaste(raw, groups, items) {
  const map = questionMap(groups);
  const next = new Map(items);
  const errors = [];
  let applied = 0;
  const set = (no, value) => {
    const g = map.get(no);
    if (!g) return errors.push(`Câu ${no} không có trong đề.`);
    const cur = { no, answer: "", keyword: "", sample: "", hint: "", ...next.get(no) };
    if (g.type === "choice") {
      const letter = value.toUpperCase();
      if (letter.length !== 1 || !g.options.includes(letter)) return errors.push(`Câu ${no}: "${value}" không thuộc ${g.options.split("").join("/")}.`);
      cur.answer = letter;
    } else if (g.type === "text") cur.answer = value;
    else cur.keyword = value;
    next.set(no, cur);
    applied++;
  };

  const textIn = String(raw || "");
  if (/\d/.test(textIn)) {
    for (const m of textIn.matchAll(/(\d{1,3})\s*[.)\]:：、．-]?\s*([^\s\d,;，；、]+)/g)) set(Number(m[1]), m[2].trim());
  } else {
    const letters = textIn.replace(/[^A-Za-z]/g, "").toUpperCase().split("");
    const choiceNos = [...map.entries()].filter(([, g]) => g.type === "choice").map(([no]) => no).sort((a, b) => a - b);
    letters.slice(0, choiceNos.length).forEach((l, i) => set(choiceNos[i], l));
    if (letters.length > choiceNos.length) errors.push(`Thừa ${letters.length - choiceNos.length} chữ cái (đề chỉ có ${choiceNos.length} câu chọn).`);
  }
  return { items: next, applied, errors };
}

/** Làm tròn điểm để hiện (3.3333 -> 3,33). */
export const fmtPoints = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("vi-VN");

/** Tổng điểm tối đa từng phần (đặt câu tính mức "đạt"). */
export function scoreSummary(groups) {
  const max = { listening: 0, reading: 0, writing: 0 };
  for (const g of groups) {
    const n = Math.max(0, g.to - g.from + 1);
    max[g.section] += n * (g.type === "sentence" ? Number(g.verdictPoints?.dat) || 0 : Number(g.points) || 0);
  }
  return { ...max, total: max.listening + max.reading + max.writing };
}

/** "23:05" từ số giây. */
export const mmss = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
