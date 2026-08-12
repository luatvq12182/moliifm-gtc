import { useState } from "react";
import { speakChinese, isSpeechSupported } from "../lib/speak.js";
import StrokeOrderModal from "./StrokeOrderModal.jsx";

export default function VocabSection({ vocabulary, onComplete }) {
  const canSpeak = isSpeechSupported();
  const [strokeChar, setStrokeChar] = useState(null); // chữ đang xem cách viết

  const hasHanzi = (text) => /[\u4e00-\u9fff]/.test(text || "");

  return (
    <div>
      <div className="space-y-3 mb-4">
        {vocabulary.map((item, i) => {
          const isGrammar = item.pos === "Cấu trúc ngữ pháp";

          return (
            <div key={i} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-lg font-medium">{item.hanzi}</span>
                <span className="text-sm text-gray-500">{item.pinyin}</span>

                {canSpeak && !isGrammar && (
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
                {!isGrammar && hasHanzi(item.hanzi) && (
                  <button
                    onClick={() => setStrokeChar(item.hanzi)}
                    title="Xem cách viết chữ này"
                    className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 shrink-0 text-gray-600"
                  >
                    <BrushIcon />
                  </button>
                )}

                <span className="text-xs text-primary-dark bg-primary/20 px-2 py-0.5 rounded ml-auto">
                  {item.pos}
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-2">{item.meaning}</p>

              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-500 mb-1">Ví dụ:</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm">{item.example.hanzi}</p>
                  {canSpeak && item.example?.hanzi && (
                    <button
                      onClick={() => speakChinese(item.example.hanzi)}
                      title="Nghe cách đọc câu ví dụ"
                      className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 shrink-0 text-gray-500"
                    >
                      <SpeakerIcon small />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.example.pinyin}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.example.vi}
                </p>
              </div>
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
