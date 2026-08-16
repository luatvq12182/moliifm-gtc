import { useState } from "react";
import { speakChinese, isSpeechSupported } from "../lib/speak.js";
import StrokeOrderModal from "./StrokeOrderModal.jsx";

// Chuẩn hóa danh sách ví dụ của một từ về mảng, hỗ trợ cả cấu trúc cũ lẫn mới:
//  - Bài mới: item.examples (mảng) -> dùng luôn, lọc bỏ ví dụ trống.
//  - Bài cũ: chỉ có item.example (một object) -> gói thành mảng 1 phần tử.
//  - Không có ví dụ -> mảng rỗng (khối ví dụ sẽ không hiển thị).
function getExamples(item) {
  const list =
    Array.isArray(item?.examples) && item.examples.length > 0
      ? item.examples
      : item?.example
        ? [item.example]
        : [];
  // Chỉ giữ ví dụ có ít nhất một trường không rỗng.
  return list.filter((ex) => ex && (ex.hanzi || ex.pinyin || ex.vi));
}

export default function VocabSection({ vocabulary, onComplete }) {
  const canSpeak = isSpeechSupported();
  const [strokeChar, setStrokeChar] = useState(null); // chữ đang xem cách viết

  const hasHanzi = (text) => /[\u4e00-\u9fff]/.test(text || "");

  // Phòng khi vocabulary chưa về / không phải mảng (tránh .map trên undefined).
  const items = Array.isArray(vocabulary) ? vocabulary : [];

  return (
    <div>
      <div className="space-y-3 mb-4">
        {items.map((item, i) => {
          const isGrammar = item?.pos === "Cấu trúc ngữ pháp";
          const examples = getExamples(item);

          return (
            <div key={i} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-lg font-medium">{item?.hanzi}</span>
                <span className="text-sm text-gray-500">{item?.pinyin}</span>

                {canSpeak && !isGrammar && hasHanzi(item?.hanzi) && (
                  <button
                    onClick={() => speakChinese(item.hanzi)}
                    title="Nghe cách đọc từ này"
                    className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 shrink-0 text-gray-600"
                  >
                    <SpeakerIcon />
                  </button>
                )}

                {/* Xem cách viết — chỉ hiện khi từ có chữ Hán và không phải
                    cụm cấu trúc ngữ pháp (cụm lai Latin không viết được). */}
                {hasHanzi(item?.hanzi) && (
                  <button
                    onClick={() => setStrokeChar(item.hanzi)}
                    title="Xem cách viết chữ này"
                    className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 shrink-0 text-gray-600"
                  >
                    <BrushIcon />
                  </button>
                )}

                {item?.pos && (
                  <span className="text-xs text-primary-dark bg-primary/20 px-2 py-0.5 rounded ml-auto">
                    {item.pos}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-700 mb-2">{item?.meaning}</p>

              {/* Khối ví dụ — hiển thị lần lượt từng ví dụ (có thể nhiều). */}
              {examples.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-2.5 space-y-2.5">
                  <p className="text-xs text-gray-500">
                    {examples.length > 1
                      ? `Ví dụ (${examples.length}):`
                      : "Ví dụ:"}
                  </p>

                  {examples.map((ex, exIndex) => (
                    <div
                      key={exIndex}
                      className={
                        exIndex > 0 ? "pt-2.5 border-t border-gray-200" : ""
                      }
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm">{ex.hanzi}</p>
                        {canSpeak && ex.hanzi && (
                          <button
                            onClick={() => speakChinese(ex.hanzi)}
                            title="Nghe cách đọc câu ví dụ"
                            className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 shrink-0 text-gray-500"
                          >
                            <SpeakerIcon small />
                          </button>
                        )}
                      </div>
                      {ex.pinyin && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ex.pinyin}
                        </p>
                      )}
                      {ex.vi && (
                        <p className="text-xs text-gray-500 mt-0.5">{ex.vi}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onComplete}
        className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
      >
        Tiếp tục
      </button>

      {strokeChar && (
        <StrokeOrderModal
          hanzi={strokeChar}
          onClose={() => setStrokeChar(null)}
        />
      )}
    </div>
  );
}

function SpeakerIcon({ small }) {
  const size = small ? 11 : 12;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="3 9 3 15 8 15 13 20 13 4 8 9 3 9" />
      <path d="M16 8a5 5 0 010 8" strokeLinecap="round" />
    </svg>
  );
}

function BrushIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M12 19l7-7 3 3-7 7-3-3z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 2l7.586 7.586" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}
