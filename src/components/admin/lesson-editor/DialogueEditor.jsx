import { useEffect, useRef, useState } from "react";
import ListEditor from "./ListEditor.jsx";

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
