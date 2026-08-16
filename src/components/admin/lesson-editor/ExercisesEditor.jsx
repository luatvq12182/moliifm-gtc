import { useState } from "react";
import ListEditor from "./ListEditor.jsx";

// Cho phép admin gõ nhanh theo đúng định dạng có sẵn trong file docx gốc:
// "她(tā), 是(shì), 我(wǒ)" — parse thành mảng {hanzi, pinyin} để lưu vào DB.
function parseWords(text) {
  return text
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^(.+?)\((.+)\)$/);
      if (match) return { hanzi: match[1].trim(), pinyin: match[2].trim() };
      return { hanzi: token, pinyin: "" };
    });
}

function formatWords(words) {
  return (words || [])
    .map((w) => (w.pinyin ? `${w.hanzi}(${w.pinyin})` : w.hanzi))
    .join(", ");
}

const TABS = [
  { key: "multipleChoice", label: "Chọn đáp án đúng" },
  { key: "trueFalse", label: "Đúng / Sai" },
  { key: "sentenceOrder", label: "Sắp xếp câu" },
  { key: "shortAnswer", label: "Trả lời câu hỏi" },
];

const NEW_MC = () => ({
  question: "",
  pinyin: "",
  options: [
    { hanzi: "", pinyin: "" },
    { hanzi: "", pinyin: "" },
  ],
  correctIndex: 0,
});
const NEW_TF = () => ({
  statement: "",
  pinyin: "",
  correct: true,
  correction: "",
  correctionPinyin: "",
});
const NEW_SO = () => ({ words: [], correctSentence: "" });
const NEW_SA = () => ({ question: "", pinyin: "", acceptedAnswers: [] });

export default function ExercisesEditor({ exercises, onChange }) {
  const [activeTab, setActiveTab] = useState("multipleChoice");

  const updateList = (key) => (items) => {
    onChange({ ...exercises, [key]: items });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={
              "px-3 py-1.5 text-xs rounded-md border " +
              (activeTab === t.key
                ? "bg-primary border-primary-dark font-medium"
                : "border-gray-300 hover:bg-gray-50")
            }
          >
            {t.label} ({exercises[t.key]?.length || 0})
          </button>
        ))}
      </div>

      {activeTab === "multipleChoice" && (
        <ListEditor
          items={exercises.multipleChoice}
          onChange={updateList("multipleChoice")}
          newItem={NEW_MC}
          addLabel="+ Thêm câu chọn đáp án"
          renderItem={(item, index, update) => (
            <div className="space-y-2">
              <input
                type="text"
                value={item.question}
                onChange={(e) => update({ question: e.target.value })}
                placeholder="Câu hỏi (chữ Hán) *"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
              />
              <input
                type="text"
                value={item.pinyin}
                onChange={(e) => update({ pinyin: e.target.value })}
                placeholder="Pinyin câu hỏi"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
              />
              <p className="text-[11px] text-gray-400">
                Đáp án (chọn nút tròn để đánh dấu đúng):
              </p>
              <div className="space-y-1.5">
                {item.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={item.correctIndex === optIndex}
                      onChange={() => update({ correctIndex: optIndex })}
                    />
                    <input
                      type="text"
                      value={opt.hanzi}
                      onChange={(e) => {
                        const options = item.options.map((o, i) =>
                          i === optIndex ? { ...o, hanzi: e.target.value } : o,
                        );
                        update({ options });
                      }}
                      placeholder="Chữ Hán"
                      className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      value={opt.pinyin}
                      onChange={(e) => {
                        const options = item.options.map((o, i) =>
                          i === optIndex ? { ...o, pinyin: e.target.value } : o,
                        );
                        update({ options });
                      }}
                      placeholder="Pinyin"
                      className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          options: item.options.filter(
                            (_, i) => i !== optIndex,
                          ),
                        })
                      }
                      className="text-xs text-red-400 hover:underline shrink-0"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  update({
                    options: [...item.options, { hanzi: "", pinyin: "" }],
                  })
                }
                className="text-xs text-primary-dark hover:underline"
              >
                + Thêm đáp án
              </button>
            </div>
          )}
        />
      )}

      {activeTab === "trueFalse" && (
        <ListEditor
          items={exercises.trueFalse}
          onChange={updateList("trueFalse")}
          newItem={NEW_TF}
          addLabel="+ Thêm câu đúng/sai"
          renderItem={(item, index, update) => (
            <div className="space-y-2">
              <input
                type="text"
                value={item.statement}
                onChange={(e) => update({ statement: e.target.value })}
                placeholder="Câu nhận định (chữ Hán) *"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
              />
              <input
                type="text"
                value={item.pinyin}
                onChange={(e) => update({ pinyin: e.target.value })}
                placeholder="Pinyin"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
              />
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    checked={item.correct === true}
                    onChange={() => update({ correct: true })}
                  />
                  Đúng
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    checked={item.correct === false}
                    onChange={() => update({ correct: false })}
                  />
                  Sai
                </label>
              </div>

              {/* Câu sửa — chỉ nhập khi đáp án là "Sai". Khách soạn sẵn phần
                  sửa (chữ Hán + phiên âm) trong một số câu của file Word. */}
              {item.correct === false && (
                <div className="rounded-lg border border-gray-200 p-2 space-y-2 bg-gray-50">
                  <p className="text-[11px] text-gray-400">
                    Câu sửa cho đúng (tùy chọn — hiện cho học viên khi xem lại
                    câu sai):
                  </p>
                  <input
                    type="text"
                    value={item.correction || ""}
                    onChange={(e) => update({ correction: e.target.value })}
                    placeholder="Câu sửa (chữ Hán)"
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    value={item.correctionPinyin || ""}
                    onChange={(e) =>
                      update({ correctionPinyin: e.target.value })
                    }
                    placeholder="Phiên âm câu sửa"
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          )}
        />
      )}

      {activeTab === "sentenceOrder" && (
        <ListEditor
          items={exercises.sentenceOrder}
          onChange={updateList("sentenceOrder")}
          newItem={NEW_SO}
          addLabel="+ Thêm câu sắp xếp"
          renderItem={(item, index, update) => (
            <div className="space-y-2">
              <input
                type="text"
                value={formatWords(item.words)}
                onChange={(e) => update({ words: parseWords(e.target.value) })}
                placeholder="她(tā), 是(shì), 我(wǒ), 的(de), 朋友(péngyou)"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
              />
              <p className="text-[11px] text-gray-400">
                Mỗi từ theo định dạng chữ_Hán(pinyin), cách nhau bằng dấu phẩy.
              </p>
              <input
                type="text"
                value={item.correctSentence}
                onChange={(e) => update({ correctSentence: e.target.value })}
                placeholder="Câu đúng sau khi sắp xếp (vd. 她是我的朋友。)"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
              />
            </div>
          )}
        />
      )}

      {activeTab === "shortAnswer" && (
        <ListEditor
          items={exercises.shortAnswer}
          onChange={updateList("shortAnswer")}
          newItem={NEW_SA}
          addLabel="+ Thêm câu hỏi tự luận"
          renderItem={(item, index, update) => (
            <div className="space-y-2">
              <input
                type="text"
                value={item.question}
                onChange={(e) => update({ question: e.target.value })}
                placeholder="Câu hỏi (chữ Hán) *"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
              />
              <input
                type="text"
                value={item.pinyin}
                onChange={(e) => update({ pinyin: e.target.value })}
                placeholder="Pinyin"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
              />
              <p className="text-[11px] text-gray-400">
                Các đáp án được chấp nhận (học viên trả lời trùng 1 trong các
                đáp án này là đúng):
              </p>
              <div className="space-y-1.5">
                {item.acceptedAnswers.map((ans, ansIndex) => (
                  <div key={ansIndex} className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 w-5 shrink-0">
                      {ansIndex + 1}.
                    </span>
                    <input
                      type="text"
                      value={ans}
                      onChange={(e) => {
                        const acceptedAnswers = item.acceptedAnswers.map(
                          (a, i) => (i === ansIndex ? e.target.value : a),
                        );
                        update({ acceptedAnswers });
                      }}
                      placeholder="Một đáp án chấp nhận"
                      className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          acceptedAnswers: item.acceptedAnswers.filter(
                            (_, i) => i !== ansIndex,
                          ),
                        })
                      }
                      className="text-xs text-red-400 hover:underline shrink-0"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
                {item.acceptedAnswers.length === 0 && (
                  <p className="text-[11px] text-gray-300 italic">
                    Chưa có đáp án nào — bấm "Thêm đáp án" bên dưới.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  update({ acceptedAnswers: [...item.acceptedAnswers, ""] })
                }
                className="text-xs text-primary-dark hover:underline"
              >
                + Thêm đáp án
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}
