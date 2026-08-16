import { useState } from "react";
import ListEditor from "./ListEditor.jsx";

const NEW_ITEM = () => ({
  hanzi: "",
  pinyin: "",
  pos: "",
  meaning: "",
  examples: [{ hanzi: "", pinyin: "", vi: "" }],
});

const NEW_EXAMPLE = () => ({ hanzi: "", pinyin: "", vi: "" });

// Chuẩn hóa 1 vocab item về dạng có mảng "examples" để hiển thị/sửa.
// - Bài mới: đã có examples -> dùng luôn.
// - Bài cũ: chỉ có "example" (một object) -> gói thành mảng 1 phần tử để sửa.
// - Không có gì -> cho 1 ví dụ trống để bắt đầu nhập.
function getExamples(item) {
  if (Array.isArray(item.examples) && item.examples.length > 0) {
    return item.examples;
  }
  if (
    item.example &&
    (item.example.hanzi || item.example.pinyin || item.example.vi)
  ) {
    return [item.example];
  }
  return [{ hanzi: "", pinyin: "", vi: "" }];
}

export default function VocabularyEditor({ vocabulary, onChange }) {
  const [openIndices, setOpenIndices] = useState({});

  const toggleOpen = (index) => {
    setOpenIndices((s) => ({ ...s, [index]: !s[index] }));
  };

  return (
    <ListEditor
      items={vocabulary}
      onChange={onChange}
      newItem={NEW_ITEM}
      addLabel="+ Thêm từ vựng"
      renderItem={(item, index, update) => {
        const isOpen = openIndices[index] ?? item.hanzi === "";
        const examples = getExamples(item);

        // Ghi lại toàn bộ mảng examples vào item. Đồng thời xóa "example" cũ
        // (nếu có) để không còn hai nguồn dữ liệu song song sau khi sửa.
        const setExamples = (next) => {
          update({ examples: next, example: undefined });
        };

        const updateExample = (exIndex, patch) => {
          const next = examples.map((ex, i) =>
            i === exIndex ? { ...ex, ...patch } : ex,
          );
          setExamples(next);
        };

        const addExample = () => {
          setExamples([...examples, NEW_EXAMPLE()]);
        };

        const removeExample = (exIndex) => {
          // Luôn giữ tối thiểu 1 ví dụ (trống cũng được), tránh mảng rỗng.
          const next = examples.filter((_, i) => i !== exIndex);
          setExamples(next.length > 0 ? next : [NEW_EXAMPLE()]);
        };

        return (
          <div>
            <button
              type="button"
              onClick={() => toggleOpen(index)}
              className="w-full flex items-center gap-2.5 text-left"
            >
              <ChevronIcon open={isOpen} />
              <div className="flex-1 min-w-0 flex items-baseline gap-2">
                <span className="font-medium text-base truncate min-w-0">
                  {item.hanzi || "(chưa nhập từ vựng)"}
                </span>
                {item.pos && (
                  <span className="text-xs text-primary-dark bg-primary/20 px-2 py-0.5 rounded shrink-0">
                    {item.pos}
                  </span>
                )}
              </div>
            </button>

            {isOpen && (
              <div className="space-y-2 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={item.hanzi}
                    onChange={(e) => update({ hanzi: e.target.value })}
                    placeholder="Chữ Hán *"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    value={item.pinyin}
                    onChange={(e) => update({ pinyin: e.target.value })}
                    placeholder="Pinyin"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={item.pos}
                    onChange={(e) => update({ pos: e.target.value })}
                    placeholder="Từ loại (vd. Động từ)"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    value={item.meaning}
                    onChange={(e) => update({ meaning: e.target.value })}
                    placeholder="Nghĩa tiếng Việt"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-gray-400">
                    Câu ví dụ ({examples.length}):
                  </p>
                </div>

                {examples.map((ex, exIndex) => (
                  <div
                    key={exIndex}
                    className="rounded-lg border border-gray-200 p-2 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        Ví dụ {exIndex + 1}
                      </span>
                      {examples.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExample(exIndex)}
                          className="text-[11px] text-red-500 hover:underline"
                        >
                          Xóa ví dụ
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={ex.hanzi || ""}
                        onChange={(e) =>
                          updateExample(exIndex, { hanzi: e.target.value })
                        }
                        placeholder="Chữ Hán"
                        className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={ex.pinyin || ""}
                        onChange={(e) =>
                          updateExample(exIndex, { pinyin: e.target.value })
                        }
                        placeholder="Pinyin"
                        className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={ex.vi || ""}
                        onChange={(e) =>
                          updateExample(exIndex, { vi: e.target.value })
                        }
                        placeholder="Dịch nghĩa"
                        className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExample}
                  className="text-xs text-primary-dark hover:underline"
                >
                  + Thêm ví dụ
                </button>
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
