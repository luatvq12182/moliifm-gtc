import { useState } from "react";
import ListEditor from "./ListEditor.jsx";

const NEW_ITEM = () => ({
  hanzi: "",
  pinyin: "",
  pos: "",
  meaning: "",
  example: { hanzi: "", pinyin: "", vi: "" },
});

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
                <p className="text-[11px] text-gray-400 pt-1">Câu ví dụ:</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={item.example?.hanzi || ""}
                    onChange={(e) =>
                      update({
                        example: { ...item.example, hanzi: e.target.value },
                      })
                    }
                    placeholder="Chữ Hán"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    value={item.example?.pinyin || ""}
                    onChange={(e) =>
                      update({
                        example: { ...item.example, pinyin: e.target.value },
                      })
                    }
                    placeholder="Pinyin"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    value={item.example?.vi || ""}
                    onChange={(e) =>
                      update({
                        example: { ...item.example, vi: e.target.value },
                      })
                    }
                    placeholder="Dịch nghĩa"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>
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
