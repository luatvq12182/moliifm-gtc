import { forwardRef, useImperativeHandle, useRef, useState } from "react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

// Video hội thoại dùng chung cho cả bước "Xem video" (gate) và cột trái khi đã
// chuyển sang layout 2 cột. Tự tính câu thoại đang phát dựa trên startTime/endTime
// của từng dòng trong `dialogue`, báo lên cha qua onActiveLineChange. Cha (hoặc
// phần Luyện nói) có thể gọi ref.playSegment(start, end) để phát lại đúng 1 câu.
const LessonVideoPlayer = forwardRef(function LessonVideoPlayer(
  { videoSrc, dialogue, onEnded, onActiveLineChange, compact = false },
  ref,
) {
  const videoRef = useRef(null);
  const segmentEndRef = useRef(null);
  const [speed, setSpeed] = useState(1);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDetails, setShowDetails] = useState(false);

  useImperativeHandle(ref, () => ({
    playSegment(start, end) {
      const v = videoRef.current;
      if (!v) return;
      segmentEndRef.current = typeof end === "number" ? end : null;
      v.currentTime = start || 0;
      v.play();
    },
  }));

  const changeSpeed = (s) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;

    if (
      segmentEndRef.current != null &&
      v.currentTime >= segmentEndRef.current
    ) {
      v.pause();
      segmentEndRef.current = null;
    }

    const idx = dialogue.findIndex(
      (line) => v.currentTime >= line.startTime && v.currentTime < line.endTime,
    );
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      onActiveLineChange && onActiveLineChange(idx);
    }
  };

  const activeLine = activeIndex >= 0 ? dialogue[activeIndex] : null;

  return (
    <div>
      <div className="relative rounded-lg overflow-hidden bg-black mb-3">
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          controlsList="nodownload"
          className={"w-full aspect-video " + (compact ? "" : "")}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onEnded}
        >
          Trình duyệt của bạn không hỗ trợ thẻ video.
        </video>

        {activeLine && (
          <div
            style={
              {
                display: 'none'
              }
            }
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-3 pointer-events-none"
          >
            <p className="text-white text-center font-medium text-base sm:text-lg leading-snug">
              {activeLine.hanzi}
            </p>
            {showDetails && (
              <>
                <p className="text-white/80 text-center text-xs sm:text-sm mt-1">
                  {activeLine.pinyin}
                </p>
                <p className="text-white/70 text-center text-xs mt-0.5">
                  {activeLine.vi}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">Tốc độ:</span>
        <select
          value={speed}
          onChange={(e) => changeSpeed(Number(e.target.value))}
          className="px-2 py-1 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-50"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>

        <button
          style={
            {
              display: 'none'
            }
          }
          onClick={() => setShowDetails((v) => !v)}
          className="ml-auto px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
        >
          {showDetails ? "Ẩn phiên âm & dịch" : "Hiện phiên âm & dịch"}
        </button>
      </div>
    </div>
  );
});

export default LessonVideoPlayer;
