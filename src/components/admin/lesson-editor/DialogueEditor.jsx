import { useEffect, useRef, useState } from "react";
import ListEditor from "./ListEditor.jsx";
import { toSpeakableText, HAS_HAN } from "../../../lib/numericText.js";

const NEW_LINE = () => ({
  speaker: "",
  hanzi: "",
  pinyin: "",
  vi: "",
  startTime: 0,
  endTime: 0,
});

export default function DialogueEditor({ dialogue, onChange }) {
  const [openIndices, setOpenIndices] = useState({});
  const prevLengthRef = useRef(dialogue.length);

  // Chỉ tự mở dòng MỚI THÊM đúng 1 lần (khi mảng dài ra) — không tính lại
  // theo nội dung mỗi lần gõ, tránh bug tự đóng khi vừa paste/gõ chữ đầu
  // tiên vào ô Chữ Hán.
  useEffect(() => {
    if (dialogue.length > prevLengthRef.current) {
      setOpenIndices((s) => ({ ...s, [dialogue.length - 1]: true }));
    }
    prevLengthRef.current = dialogue.length;
  }, [dialogue.length]);

  const toggleOpen = (index) => {
    setOpenIndices((s) => ({ ...s, [index]: !s[index] }));
  };

  return (
    <ListEditor
      items={dialogue}
      onChange={onChange}
      newItem={NEW_LINE}
      addLabel="+ Thêm câu thoại"
      renderItem={(line, index, update) => {
        // Câu chưa nhập gì (vừa bấm "+ Thêm") tự mở sẵn để nhập luôn, không
        // bắt phải bấm thêm 1 lần để mở ra.
        const isOpen = openIndices[index] ?? line.hanzi === "";

        return (
          <div>
            <button
              type="button"
              onClick={() => toggleOpen(index)}
              className="w-full flex items-center gap-2.5 text-left"
            >
              <ChevronIcon open={isOpen} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="text-gray-500 shrink-0">
                    {line.speaker || "—"}
                  </span>
                  <span className="font-medium truncate min-w-0 flex-1">
                    {line.hanzi || "(chưa nhập lời thoại)"}
                  </span>
                </div>
                <p className="text-xs text-orange-400 mt-0.5">
                  {line.startTime}s – {line.endTime}s
                </p>
              </div>
            </button>

            {isOpen && (
              <div className="space-y-2 mt-3">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={line.speaker}
                    onChange={(e) => update({ speaker: e.target.value })}
                    placeholder="Người nói (vd. 秋荷)"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={line.startTime}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "" || /^-?\d*\.?\d*$/.test(raw))
                        update({ startTime: raw });
                    }}
                    onBlur={(e) => {
                      const num = Number(e.target.value);
                      update({ startTime: Number.isFinite(num) ? num : 0 });
                    }}
                    placeholder="Bắt đầu (s)"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={line.endTime}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "" || /^-?\d*\.?\d*$/.test(raw))
                        update({ endTime: raw });
                    }}
                    onBlur={(e) => {
                      const num = Number(e.target.value);
                      update({ endTime: Number.isFinite(num) ? num : 0 });
                    }}
                    placeholder="Kết thúc (s)"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={line.hanzi}
                  onChange={(e) => update({ hanzi: e.target.value })}
                  placeholder="Chữ Hán *"
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={line.pinyin}
                  onChange={(e) => update({ pinyin: e.target.value })}
                  placeholder="Pinyin"
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                />
                <NoHanziNotice hanzi={line.hanzi} pinyin={line.pinyin} />

                <input
                  type="text"
                  value={line.vi}
                  onChange={(e) => update({ vi: e.target.value })}
                  placeholder="Bản dịch tiếng Việt"
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

/**
 * Báo cho giảng viên biết dòng thoại này sẽ được gửi đi chấm dưới dạng nào.
 *
 * VÌ SAO CÓ: iFLYTEK từ chối câu mẫu KHÔNG CÓ CHỮ HÁN nào. Dòng "2038559800。"
 * của Bài 4 vì thế chết ở mọi lượt luyện nói. Máy chủ nay tự đổi sang số Hán,
 * nhưng cách đọc số thì phụ thuộc ngữ cảnh — 800 là 八百 chứ không phải 八零零,
 * 215 (số phòng) là 二幺五 chứ không phải 二一五. Chỉ người soạn bài mới biết
 * chắc, và họ đã ghi sẵn trong ô Pinyin.
 *
 * ĐÂY LÀ XEM TRƯỚC, KHÔNG PHẢI BẮT LỖI. Dòng thoại đọc số điện thoại là nội
 * dung hợp lệ; chặn lại là ép giảng viên bóp méo bài học cho vừa ý máy. Vẫn lưu
 * bình thường.
 */
function NoHanziNotice({ hanzi, pinyin }) {
  const text = (hanzi || "").trim();
  // Im lặng ở trường hợp thường gặp: chưa nhập gì, hoặc đã có chữ Hán.
  if (!text || HAS_HAN.test(text)) return null;

  const result = toSpeakableText(text, pinyin);

  if (!result.text) {
    return (
      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
        Dòng này không có chữ Hán lẫn chữ số nên <strong>không chấm phát âm
        được</strong>. Học viên sẽ thấy báo lỗi khi luyện nói câu này.
      </p>
    );
  }

  return (
    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
      Dòng này không có chữ Hán. Khi chấm phát âm, máy sẽ đọc là{" "}
      <strong className="text-sm">{result.text}</strong>
      {result.source === "pinyin"
        ? " (theo ô Pinyin ở trên)."
        : " — đọc rời từng chữ số, vì ô Pinyin chưa cho biết cách đọc. Nếu phải đọc khác (vd. 800 là 八百), hãy điền Pinyin."}
    </p>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={"shrink-0 transition-transform " + (open ? "rotate-180" : "")}
    >
      <polyline
        points="6 9 12 15 18 9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
