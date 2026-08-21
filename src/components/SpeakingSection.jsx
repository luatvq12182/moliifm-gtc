import { useEffect, useRef, useState } from "react";
import SpeakingPracticeModal from "./SpeakingPracticeModal.jsx";

export default function SpeakingSection({
  dialogue,
  activeVideoIndex,
  activeLineIndex,
  lessonContext,
  onRequestPlaySegment,
  onComplete,
}) {
  const [pinyinVisible, setPinyinVisible] = useState({});
  const [viVisible, setViVisible] = useState({});
  const [results, setResults] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  const togglePinyin = (index) =>
    setPinyinVisible((s) => ({ ...s, [index]: !s[index] }));
  const toggleVi = (index) =>
    setViVisible((s) => ({ ...s, [index]: !s[index] }));

  const attemptedCount = Object.keys(results).length;
  const allAttempted = attemptedCount === dialogue.length;

  const openModal = (index) => {
    setModalIndex(index);
    setModalOpen(true);
  };

  const saveResult = (index, result) => {
    setResults((r) => {
      // Luyện lại cùng một câu -> thu hồi object URL của bản ghi cũ. Không thu
      // hồi thì mỗi lần luyện lại là một blob bị bỏ quên trong bộ nhớ, luyện
      // nhiều lần sẽ phình dần.
      const previous = r[index];
      if (previous?.audioUrl && previous.audioUrl !== result.audioUrl) {
        URL.revokeObjectURL(previous.audioUrl);
      }
      return { ...r, [index]: result };
    });
  };

  // Rời khỏi phần luyện nói -> nhả toàn bộ bản ghi đang giữ trong bộ nhớ.
  // resultsRef để hàm dọn dẹp luôn nhìn thấy giá trị mới nhất mà không cần đưa
  // results vào mảng phụ thuộc (làm vậy sẽ dọn nhầm sau mỗi lần lưu kết quả).
  // Cập nhật ref trong effect, KHÔNG gán thẳng lúc render — gán khi render là
  // thao tác phụ (side effect) trong pha render, React không đảm bảo an toàn.
  const resultsRef = useRef(results);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    return () => {
      Object.values(resultsRef.current).forEach((r) => {
        if (r?.audioUrl) URL.revokeObjectURL(r.audioUrl);
      });
    };
  }, []);

  const finish = () => {
    // Bỏ qua các lượt không có điểm hợp lệ (bị iFLYTEK từ chối, hoặc đọc thiếu
    // nên không qua cổng chấm). Gộp chúng vào như số 0 sẽ kéo tụt điểm trung
    // bình một cách oan uổng.
    const scores = Object.values(results)
      .map((r) => r.pronScore)
      .filter((v) => typeof v === "number");
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    onComplete({ avgScore: avg, lineScores: scores });
  };

  let lastVideoTitle = null;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Đã luyện: {attemptedCount}/{dialogue.length} câu
      </p>

      <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1 mb-4">
        {dialogue.map((line, index) => {
          const isActive =
            line.videoIndex === activeVideoIndex &&
            line.localIndex === activeLineIndex;
          const result = results[index];
          const showPinyin = Boolean(pinyinVisible[index]);
          const showVi = Boolean(viVisible[index]);
          const showVideoHeader =
            dialogue.some((l) => l.videoIndex !== dialogue[0].videoIndex) &&
            line.videoTitle !== lastVideoTitle;
          lastVideoTitle = line.videoTitle;

          return (
            <div key={index}>
              {showVideoHeader && (
                <p className="text-[11px] font-medium text-gray-400 mt-3 mb-1.5 first:mt-0">
                  {line.videoTitle || `Video ${line.videoIndex + 1}`}
                </p>
              )}

              <div
                className={
                  "rounded-lg border p-3 transition " +
                  (isActive
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200 bg-white")
                }
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() =>
                      onRequestPlaySegment(
                        line.videoIndex,
                        line.startTime,
                        line.endTime,
                      )
                    }
                    title="Nghe lại câu này"
                    className="shrink-0 w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 mt-0.5"
                  >
                    <PlayIcon />
                  </button>

                  <button
                    onClick={() => openModal(index)}
                    className="flex-1 min-w-0 text-left"
                  >
                    {showPinyin && (
                      <p className="text-xs text-gray-400 mb-0.5">
                        {line.pinyin}
                      </p>
                    )}
                    <p className="text-sm font-medium">
                      {line.speaker && (
                        <span className="text-gray-400 font-normal mr-1.5">{line.speaker}:</span>
                      )}
                      {line.hanzi}
                    </p>
                    {showVi && (
                      <p className="text-xs text-gray-400 mt-0.5">{line.vi}</p>
                    )}
                  </button>

                  <button
                    onClick={() => openModal(index)}
                    className={
                      "shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium mt-0.5 " +
                      (result
                        ? "border-green-400 bg-green-100 text-green-700"
                        : "border-gray-300 text-gray-500 hover:bg-gray-50")
                    }
                  >
                    <MicIcon />
                    {result
                      ? typeof result.pronScore === "number"
                        ? `${result.pronScore}đ`
                        : "Đọc lại"
                      : "Luyện nói"}
                  </button>
                </div>

                <div className="flex items-center gap-3 mt-2 pl-11">
                  <button
                    onClick={() => togglePinyin(index)}
                    className={
                      "text-[11px] underline " +
                      (showPinyin ? "text-primary-dark" : "text-gray-400")
                    }
                  >
                    {showPinyin ? "Ẩn phiên âm" : "Hiện phiên âm"}
                  </button>
                  <button
                    onClick={() => toggleVi(index)}
                    className={
                      "text-[11px] underline " +
                      (showVi ? "text-primary-dark" : "text-gray-400")
                    }
                  >
                    {showVi ? "Ẩn dịch nghĩa" : "Hiện dịch nghĩa"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={finish}
        disabled={!allAttempted}
        className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900 disabled:opacity-40"
      >
        {allAttempted
          ? "Hoàn thành bài học"
          : `Luyện hết ${dialogue.length} câu để hoàn thành`}
      </button>

      <SpeakingPracticeModal
        open={modalOpen}
        dialogue={dialogue}
        currentIndex={modalIndex}
        results={results}
        lessonContext={lessonContext}
        onClose={() => setModalOpen(false)}
        onNavigate={setModalIndex}
        onRequestPlaySegment={onRequestPlaySegment}
        onSaveResult={saveResult}
      />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0014 0v-1M12 18v3" strokeLinecap="round" />
    </svg>
  );
}
