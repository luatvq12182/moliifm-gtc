import { useState } from "react";
import { pinyin } from "pinyin-pro";
import ConfettiDecorations from "./Confetti.jsx";

// --- Pinyin tự sinh (Cách A) -------------------------------------------------
// DB chưa lưu phiên âm cho đáp án của type "Trả lời câu hỏi", nên ta tự sinh
// phiên âm ngay tại client bằng pinyin-pro. Chỉ điền khi field pinyin gốc còn
// trống — không đè lên phiên âm đã có sẵn trong dữ liệu.
//
// nonZh: 'consecutive' -> giữ nguyên phần không phải chữ Hán (số, chữ Latin)
// thành 1 khối, tránh bị tách rời từng ký tự. Ví dụ "35岁" -> "35 suì".

const hasHanzi = (text) => /[\u4e00-\u9fff]/.test(text || "");

// Cache kết quả để không tính lại mỗi lần re-render (đáp án là chuỗi cố định).
const pinyinCache = new Map();

function toPinyin(text) {
  if (!text || !hasHanzi(text)) return "";
  if (pinyinCache.has(text)) return pinyinCache.get(text);
  let result = "";
  try {
    result = pinyin(text, { nonZh: "consecutive" });
  } catch (e) {
    result = ""; // lỗi thì bỏ qua, không làm vỡ UI
  }
  pinyinCache.set(text, result);
  return result;
}

// Trả về pinyin đã-có nếu DB cung cấp, ngược lại tự sinh từ chữ Hán.
function resolvePinyin(existing, hanziText) {
  if (existing) return existing;
  return toPinyin(hanziText);
}

export default function ExerciseResultCard({
  correct,
  total,
  wrongAnswers = [],
}) {
  const percent = Math.round((correct / total) * 100);
  const wrong = total - correct;
  const message = getFeedbackMessage(percent);
  const [showWrong, setShowWrong] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-100 px-5 py-8 mb-4">
        <ConfettiDecorations />

        <div className="relative flex flex-col items-center text-center">
          {/* Huy hiệu điểm số + vòng nguyệt quế 2 bên */}
          <div className="relative flex items-center justify-center mb-1">
            <div className="absolute inset-0 rounded-full bg-primary/40 blur-2xl scale-110" />
            <div className="relative w-36 h-36 rounded-full bg-white border-[6px] border-primary flex flex-col items-center justify-center shadow-lg">
              <span className="text-5xl font-heading font-extrabold text-primary-dark leading-none">
                {percent}
              </span>
              <span className="text-xs text-gray-500 mt-1">/100 điểm</span>
            </div>
          </div>

          <h3 className="text-xl font-heading font-bold text-gray-800 mb-3">
            Kết quả luyện tập
          </h3>

          <div className="w-full bg-white rounded-2xl border border-amber-100 px-4 py-3 flex items-center gap-3 mb-5">
            <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
              <CheckIcon />
            </span>
            <p className="text-sm text-gray-700 text-left">{message}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            <StatCard
              icon={<TargetIcon />}
              iconBg="bg-orange-100 text-orange-500"
              label="Điểm số"
              value={`${percent}/100`}
              valueColor="text-orange-500"
            />
            <StatCard
              icon={<ListIcon />}
              iconBg="bg-green-100 text-green-500"
              label="Số câu đúng"
              value={correct}
              valueColor="text-green-600"
            />
            <button
              type="button"
              onClick={() => wrong > 0 && setShowWrong(true)}
              className={
                wrong > 0
                  ? "cursor-pointer text-left"
                  : "text-left cursor-default"
              }
            >
              <StatCard
                icon={<XIcon />}
                iconBg="bg-red-100 text-red-500"
                label={wrong > 0 ? "Số câu sai (xem)" : "Số câu sai"}
                value={wrong}
                valueColor="text-blue-500"
              />
            </button>
            <StatCard
              icon={<PieIcon />}
              iconBg="bg-purple-100 text-purple-500"
              label="Tỉ lệ đúng"
              value={`${percent}%`}
              valueColor="text-purple-500"
            />
          </div>
        </div>
      </div>

      {showWrong && (
        <WrongAnswersModal
          items={wrongAnswers}
          onClose={() => setShowWrong(false)}
        />
      )}
    </>
  );
}

function WrongAnswersModal({ items, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <p className="font-heading font-semibold">
            Các câu làm sai ({items.length})
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3">
          {items.map((item, i) => {
            // Tự sinh phiên âm cho các phần còn thiếu (ưu tiên pinyin từ DB).
            const questionPinyin = resolvePinyin(item.pinyin, item.question);
            const yourPinyin = resolvePinyin(item.yourPinyin, item.yourAnswer);
            const correctPinyin = resolvePinyin(
              item.correctPinyin,
              item.correctAnswer,
            );

            return (
              <div key={i} className="rounded-xl border border-gray-200 p-3">
                <span className="text-[11px] text-gray-400">{item.type}</span>
                {item.questionWords ? (
                  <div className="flex flex-wrap items-end gap-x-1 gap-y-1 mt-0.5 mb-2">
                    {item.questionWords.map((w, wi) => {
                      // questionWords: mỗi ô là 1 chữ/từ, tự sinh nếu thiếu pinyin.
                      const wPinyin = resolvePinyin(w.pinyin, w.hanzi);
                      return (
                        <span
                          key={wi}
                          className="inline-flex items-center gap-1"
                        >
                          <span className="inline-flex flex-col items-center leading-tight">
                            <span className="text-sm font-medium">
                              {w.hanzi}
                            </span>
                            {wPinyin && (
                              <span className="text-[10px] text-gray-400">
                                {wPinyin}
                              </span>
                            )}
                          </span>
                          {wi < item.questionWords.length - 1 && (
                            <span className="text-gray-300 text-sm">/</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium mt-0.5">
                      {item.question}
                    </p>
                    {questionPinyin && (
                      <p className="text-xs text-gray-400 mb-2">
                        {questionPinyin}
                      </p>
                    )}
                  </>
                )}
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-red-500 shrink-0 w-20">
                      Bạn trả lời:
                    </span>
                    <span className="flex-1 bg-red-50 px-2 py-0.5 rounded">
                      <span className="text-xs text-red-600 block">
                        {item.yourAnswer}
                      </span>
                      {yourPinyin && (
                        <span className="text-[11px] text-red-400 block">
                          {yourPinyin}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-green-600 shrink-0 w-20">
                      Đáp án đúng:
                    </span>
                    <span className="flex-1 bg-green-50 px-2 py-0.5 rounded">
                      <span className="text-xs text-green-700 block">
                        {item.correctAnswer}
                      </span>
                      {correctPinyin && (
                        <span className="text-[11px] text-green-500 block">
                          {correctPinyin}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getFeedbackMessage(percent) {
  if (percent >= 80) return "Xuất sắc! Bạn đã nắm rất vững phần này 🎉";
  if (percent >= 50) return "Bạn đã làm rất tốt! Hãy tiếp tục phát huy nhé! 🎉";
  return "Cần luyện tập thêm để nắm chắc phần này nhé, đừng nản lòng 💪";
}

function StatCard({ icon, iconBg, label, value, valueColor }) {
  return (
    <div className="bg-white rounded-2xl border border-amber-100 px-3 py-3 flex items-center gap-2.5">
      <span
        className={
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 " +
          iconBg
        }
      >
        {icon}
      </span>
      <div className="text-left min-w-0">
        <p className="text-[11px] text-gray-400 leading-tight">{label}</p>
        <p
          className={
            "text-base font-heading font-bold leading-tight " + valueColor
          }
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="3"
    >
      <polyline
        points="20 6 9 17 4 12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"
        strokeLinecap="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function PieIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
