import { useMemo, useState } from "react";
import MultipleChoice from "./exercises/MultipleChoice.jsx";
import TrueFalse from "./exercises/TrueFalse.jsx";
import SentenceOrder from "./exercises/SentenceOrder.jsx";
import ShortAnswer from "./exercises/ShortAnswer.jsx";
import ExerciseResultCard from "./ExerciseResultCard.jsx";

// Các dạng bài tập ĐÃ BIẾT, theo thứ tự hiển thị.
//
// Thêm dạng mới về sau: khai báo ở đây và thêm component tương ứng vào
// COMPONENTS bên dưới. Không phải sửa gì khác — phần còn lại tự suy ra từ
// dữ liệu thật của bài học.
const TABS = [
  { key: "multipleChoice", label: "Chọn đáp án đúng" },
  { key: "trueFalse", label: "Đúng / Sai" },
  { key: "sentenceOrder", label: "Sắp xếp câu" },
  { key: "shortAnswer", label: "Trả lời câu hỏi" },
];

const COMPONENTS = {
  multipleChoice: MultipleChoice,
  trueFalse: TrueFalse,
  sentenceOrder: SentenceOrder,
  shortAnswer: ShortAnswer,
};

export default function ExerciseSection({ exercises, onComplete }) {
  const [activeTab, setActiveTab] = useState(null);
  const [results, setResults] = useState({});
  const [wrongByTab, setWrongByTab] = useState({});

  // CHỈ giữ dạng bài THỰC SỰ CÓ câu hỏi.
  //
  // Trước đây code mặc định bài nào cũng đủ cả 4 dạng và dựng cả 4 component.
  // Nhưng schema để mặc định mảng RỖNG cho từng dạng, nên giảng viên bỏ qua một
  // dạng là component đó nhận `questions = []`, rồi `questions[0]` thành
  // undefined và nổ ngay ở dòng đọc `q.acceptedAnswers` — trắng nguyên trang.
  //
  // Nặng hơn vì cả 4 component LUÔN nằm trong DOM (cố ý, để giữ tiến trình làm
  // bài khi chuyển tab), nên một dạng rỗng đủ làm sập cả bài học dù học viên
  // chưa hề mở tới tab đó.
  const availableTabs = useMemo(
    () =>
      TABS.filter(
        (t) =>
          Array.isArray(exercises?.[t.key]) && exercises[t.key].length > 0,
      ),
    [exercises],
  );

  // Tab đang mở phải luôn nằm trong số dạng có thật. Suy ra thay vì đồng bộ
  // bằng useEffect — không có khoảnh khắc nào trỏ vào tab không tồn tại.
  const effectiveTab =
    availableTabs.find((t) => t.key === activeTab)?.key ??
    availableTabs[0]?.key ??
    null;

  const totalQuestions = availableTabs.reduce(
    (sum, t) => sum + exercises[t.key].length,
    0,
  );
  const totalCorrect = Object.values(results).reduce((sum, r) => sum + r, 0);
  const allDone =
    availableTabs.length > 0 &&
    availableTabs.every((t) => results[t.key] !== undefined);

  const finishTab = (key, correctCount, wrongList) => {
    setResults((r) => ({ ...r, [key]: correctCount }));
    setWrongByTab((w) => ({ ...w, [key]: wrongList || [] }));
    const nextTab = availableTabs.find(
      (t) => t.key !== key && results[t.key] === undefined,
    );
    if (nextTab) setActiveTab(nextTab.key);
  };

  // Bài học không có dạng bài tập nào ta dựng được — hoặc giảng viên bỏ hết,
  // hoặc khoá mới dùng dạng câu hỏi chưa hỗ trợ. Không được để học viên kẹt ở
  // đây: cho đi tiếp với 0/0 câu (màn hình kết quả sẽ hiện "--", không phải 0
  // điểm oan).
  if (availableTabs.length === 0) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-4">
          Bài học này chưa có bài tập luyện tập. Bạn có thể chuyển sang phần
          tiếp theo.
        </p>
        <button
          onClick={() => onComplete({ correct: 0, total: 0 })}
          className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
        >
          Tiếp tục
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {availableTabs.map((t) => {
          const done = results[t.key] !== undefined;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={
                "px-3 py-1.5 text-xs rounded-md border " +
                (effectiveTab === t.key
                  ? "bg-primary border-primary-dark font-medium"
                  : done
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-gray-300 hover:bg-gray-50")
              }
            >
              {done ? "✓ " : ""}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Mọi dạng bài đều nằm trong DOM, chỉ ẩn/hiện bằng CSS — nhờ vậy mỗi
          dạng tự giữ nguyên tiến trình làm bài (câu đã trả lời, đúng/sai) khi
          học viên chuyển qua tab khác rồi quay lại. */}
      {availableTabs.map((t) => {
        const Component = COMPONENTS[t.key];
        return (
          <div key={t.key} className={effectiveTab === t.key ? "" : "hidden"}>
            <Component
              questions={exercises[t.key]}
              onFinish={(c, w) => finishTab(t.key, c, w)}
            />
          </div>
        );
      })}

      {allDone && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <ExerciseResultCard
            correct={totalCorrect}
            total={totalQuestions}
            wrongAnswers={availableTabs.flatMap((t) => wrongByTab[t.key] || [])}
          />
          <button
            onClick={() =>
              onComplete({ correct: totalCorrect, total: totalQuestions })
            }
            className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
          >
            Tiếp tục
          </button>
        </div>
      )}
    </div>
  );
}
