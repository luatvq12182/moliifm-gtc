import { useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";

// Popup hiển thị hoạt ảnh thứ tự nét viết cho từng chữ Hán, dùng thư viện
// hanzi-writer (miễn phí, dữ liệu nét tải từ CDN). Với từ nhiều chữ (vd.
// "妈妈", "高兴") hiện lần lượt từng chữ, có nút chuyển qua lại.
export default function StrokeOrderModal({ hanzi, onClose }) {
  // Chỉ lấy các ký tự chữ Hán (bỏ dấu câu, khoảng trắng, ký tự Latin...).
  const chars = Array.from(hanzi || "").filter((ch) =>
    /[\u4e00-\u9fff]/.test(ch),
  );

  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const containerRef = useRef(null);
  const writerRef = useRef(null);

  const currentChar = chars[index];

  useEffect(() => {
    if (!currentChar || !containerRef.current) return;

    setStatus("loading");
    containerRef.current.innerHTML = ""; // xóa chữ cũ trước khi vẽ chữ mới

    let cancelled = false;

    const writer = HanziWriter.create(containerRef.current, currentChar, {
      width: 200,
      height: 200,
      padding: 12,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 400,
      strokeColor: "#1f2937",
      radicalColor: "#E6A800",
      showOutline: true,
      charDataLoader: (char, onComplete) => {
        // Tự tải dữ liệu nét; nếu chữ không có dữ liệu -> báo lỗi mềm.
        HanziWriter.loadCharacterData(char)
          .then((data) => {
            if (cancelled) return;
            setStatus("ready");
            onComplete(data);
          })
          .catch(() => {
            if (!cancelled) setStatus("error");
          });
      },
    });
    writerRef.current = writer;

    // Bắt đầu chạy hoạt ảnh lặp lại sau khi dữ liệu sẵn sàng.
    const startTimer = setTimeout(() => {
      if (!cancelled) writer.loopCharacterAnimation();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      writerRef.current = null;
    };
  }, [currentChar]);

  const replay = () => {
    if (writerRef.current) writerRef.current.animateCharacter();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <span className="text-sm font-medium">Cách viết chữ Hán</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col items-center">
          {/* Khung vẽ chữ */}
          <div className="relative w-[200px] h-[200px] rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
            {/* đường kẻ ô mễ (米字格) giúp căn chữ */}
            <GridLines />
            <div ref={containerRef} className="relative z-10" />
            {status === "loading" && (
              <span className="absolute text-xs text-gray-400 z-20">
                Đang tải…
              </span>
            )}
            {status === "error" && (
              <span className="absolute text-xs text-gray-400 px-4 text-center z-20">
                Chưa có dữ liệu viết cho chữ này.
              </span>
            )}
          </div>

          {/* Chuyển giữa các chữ nếu từ có nhiều chữ */}
          {chars.length > 1 && (
            <div className="flex items-center gap-2 mt-4">
              {chars.map((ch, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={
                    "w-9 h-9 rounded-lg border text-lg font-medium " +
                    (i === index
                      ? "bg-primary border-primary-dark text-gray-900"
                      : "border-gray-300 text-gray-500 hover:bg-gray-50")
                  }
                >
                  {ch}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={replay}
            disabled={status !== "ready"}
            className="mt-5 w-full py-2.5 rounded-xl font-medium bg-primary hover:bg-primary-dark text-gray-900 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <ReplayIcon />
            Xem lại
          </button>
        </div>
      </div>
    </div>
  );
}

function GridLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full text-gray-200 pointer-events-none"
      viewBox="0 0 200 200"
    >
      <line
        x1="100"
        y1="0"
        x2="100"
        y2="200"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <line
        x1="0"
        y1="100"
        x2="200"
        y2="100"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <line
        x1="0"
        y1="0"
        x2="200"
        y2="200"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <line
        x1="200"
        y1="0"
        x2="0"
        y2="200"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
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
  );
}

function ReplayIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M1 4v6h6M23 20v-6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
