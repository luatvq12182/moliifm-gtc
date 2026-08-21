import { useState } from "react";

// Huy chương theo SỐ THỨ TỰ bài học (không theo điểm):
// bài 1 = đồng, 2 = bạc, 3 = vàng, 4 = bạch kim, 5 = kim cương.
// Bài 6 trở đi (nếu có) tạm dùng kim cương — mức cao nhất.
//
// `image` trỏ tới file trong public/images/medals/. Lưu ý file huy chương Bạc
// đang đặt tên sai chính tả là "sliver.webp" (đúng phải là "silver.webp") — nếu
// sau này đổi tên file, nhớ sửa lại đường dẫn ở đây.
//
// `ribbon` chỉ dùng cho huy chương SVG dự phòng (khi ảnh chưa có / lỗi tải).
const MEDALS = [
  {
    key: "bronze",
    label: "Đồng",
    ribbon: "#B06B3A",
    image: "/images/medals/bronze.webp",
  },
  {
    key: "silver",
    label: "Bạc",
    ribbon: "#8A8C92",
    image: "/images/medals/sliver.webp",
  },
  {
    key: "gold",
    label: "Vàng",
    ribbon: "#E8A200",
    image: "/images/medals/gold.webp",
  },
  {
    key: "platinum",
    label: "Bạch kim",
    ribbon: "#7F9DB0",
    image: "/images/medals/platinum.webp",
  },
  {
    key: "diamond",
    label: "Kim cương",
    ribbon: "#5B8DEF",
    image: "/images/medals/diamond.webp",
  },
];

function getMedal(lessonOrder) {
  if (!lessonOrder || lessonOrder < 1) return null;
  const idx = Math.min(lessonOrder, MEDALS.length) - 1;
  return MEDALS[idx];
}

// Lời khích lệ theo điểm (dùng điểm trung bình bài tập + phát âm).
function getEncouragement(avg) {
  if (avg >= 90)
    return "Xuất sắc! Bạn đã hoàn thành bài học rất tốt, cứ giữ phong độ này nhé! 🎉";
  if (avg >= 75)
    return "Làm tốt lắm! Bạn đã nắm khá vững bài học, tiếp tục phát huy nhé! 👏";
  if (avg >= 60)
    return "Khá ổn rồi! Luyện thêm một chút nữa là bạn sẽ tiến bộ rõ rệt đấy! 💪";
  if (avg >= 40)
    return "Bạn đã hoàn thành bài học rồi! Đừng nản, luyện lại vài lần nữa sẽ tốt hơn nhiều nhé! 🌱";
  return "Chặng đầu bao giờ cũng khó, bạn đã cố gắng rồi! Cùng luyện lại để chắc kiến thức hơn nhé! 💛";
}

export default function LessonResultCard({
  lessonOrder,
  exerciseScore,
  pronunciationScore,
  exerciseCorrect,
  exerciseTotal,
  onBackToList,
}) {
  const medal = getMedal(lessonOrder);

  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(medal) && !imageFailed;

  // Điểm trung bình để chọn lời khích lệ. Nếu thiếu một trong hai điểm thì
  // dùng điểm còn lại; nếu thiếu cả hai thì coi như 0.
  const scores = [exerciseScore, pronunciationScore].filter(
    (s) => typeof s === "number",
  );
  const avg =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  const encouragement = getEncouragement(avg);

  const pronLabel = getPronLabel(pronunciationScore);

  return (
    // .result-lesson (src/index.css) là nền bg-result.webp — ảnh khung đã có
    // sẵn hoạ tiết cúp/sách/bút ở 4 góc nên thẻ này không cần thêm confetti.
    <div className="result-lesson relative overflow-hidden rounded-3xl border-2 border-amber-200 px-5 py-6">
      <div className="relative">
        {/* Huy chương phần thưởng */}
        {medal && (
          <div className="flex flex-col items-center mb-3">
            {showImage ? (
              <img
                src={medal.image}
                alt={`Huy chương ${medal.label}`}
                width={400}
                height={335}
                decoding="async"
                onError={() => setImageFailed(true)}
                // Ảnh huy chương không có nền trong suốt, bo góc cho đỡ lộ
                // mép chữ nhật khi nằm trên nền bg-result.
                className="w-full max-w-[200px] h-auto rounded-2xl"
              />
            ) : (
              <MedalFallback type={medal.key} ribbon={medal.ribbon} />
            )}
          </div>
        )}

        <div className="text-center mb-4">
          <h3 className="text-xl font-heading font-bold text-gray-800">
            Kết quả buổi học
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Bạn đã hoàn thành bài học, cùng xem lại kết quả nhé!
          </p>
        </div>

        {/* Lời khích lệ */}
        <div className="bg-white/70 rounded-2xl border border-amber-100 px-4 py-3 mb-4">
          <p className="text-sm text-gray-700 text-center">{encouragement}</p>
        </div>

        {/* Hai điểm số */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-amber-100 px-4 py-4 text-center">
            <div className="text-3xl font-heading font-extrabold text-orange-500">
              {typeof exerciseScore === "number" ? exerciseScore : "--"}
              <span className="text-base text-gray-400 font-normal">/100</span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full mt-1.5">
              ★ Điểm số
            </span>
            {typeof exerciseCorrect === "number" &&
              typeof exerciseTotal === "number" && (
                <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">
                  ✓ {exerciseCorrect}/{exerciseTotal} câu đúng
                </p>
              )}
          </div>

          <div className="bg-white rounded-2xl border border-amber-100 px-4 py-4 text-center">
            <div className="text-3xl font-heading font-extrabold text-purple-500">
              {typeof pronunciationScore === "number"
                ? pronunciationScore
                : "--"}
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full mt-1.5">
              🔊 Điểm phát âm
            </span>
            {pronLabel && (
              <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">
                {pronLabel}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onBackToList}
          className="w-full py-3 rounded-2xl font-medium bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white flex items-center justify-center gap-2"
        >
          Quay lại danh sách bài học →
        </button>
      </div>
    </div>
  );
}

function getPronLabel(score) {
  if (typeof score !== "number") return "";
  if (score >= 90) return "Xuất sắc";
  if (score >= 75) return "Tốt";
  if (score >= 60) return "Khá";
  return "Cần luyện thêm";
}

// Huy chương SVG dự phòng — chỉ dùng khi ảnh PNG lỗi/chưa có, để màn hình kết
// quả không bị trống một mảng.
function MedalFallback({ type, ribbon }) {
  const gradId = `medal-${type}`;
  const stops = {
    bronze: ["#E8A87C", "#B06B3A"],
    silver: ["#E8E8ED", "#A8AAB0"],
    gold: ["#FFE082", "#E8A200"],
    platinum: ["#D6F0F5", "#7F9DB0"],
    diamond: ["#A5E8FF", "#5B8DEF"],
  }[type] || ["#E8E8ED", "#A8AAB0"];

  return (
    <svg width="88" height="104" viewBox="0 0 88 104" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset="1" stopColor={stops[1]} />
        </linearGradient>
      </defs>
      {/* Ruy băng */}
      <path
        d="M30 58 L22 100 L36 92 L44 104 L52 92 L66 100 L58 58 Z"
        fill={ribbon}
        opacity="0.55"
      />
      {/* Vòng ngoài */}
      <circle
        cx="44"
        cy="42"
        r="34"
        fill={`url(#${gradId})`}
        stroke="#fff"
        strokeWidth="3"
      />
      {/* Vòng trong */}
      <circle
        cx="44"
        cy="42"
        r="25"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        opacity="0.6"
      />
      {/* Ngôi sao */}
      <path
        d="M44 24 L48.5 37 L62 37 L51 45.5 L55 58.5 L44 50.5 L33 58.5 L37 45.5 L26 37 L39.5 37 Z"
        fill="#fff"
        opacity="0.95"
      />
    </svg>
  );
}
