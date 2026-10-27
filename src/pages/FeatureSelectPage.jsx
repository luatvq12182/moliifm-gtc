import SiteHeader from "../components/SiteHeader.jsx";
import { Link } from "react-router-dom";
import { features } from "../data/features.js";
import ThumbnailImage from "../components/ThumbnailImage.jsx";

const THEME = {
  violet: {
    iconBg: "bg-violet-100",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-600",
  },
  blue: {
    iconBg: "bg-blue-100",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-600",
  },
  emerald: {
    iconBg: "bg-emerald-100",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-600",
  },
};

// Biểu tượng cho nhãn của từng chức năng (nhãn khai trong data/features.js).
const TAG_ICONS = {
  "Nghe hiểu": <HeadphoneIcon />,
  "Bài tập dạng đề HSK": <HskExerciseIcon />,
  "Luyện nói": <MicIcon />,
  "AI chấm điểm": <SparkleIcon />,
  "Slide bài giảng": <SlidesIcon />,
  "Theo từng khoá học": <BookIcon />,
};

export default function FeatureSelectPage() {
  // MỌI chức năng đang mở, không chỉ cái đầu tiên — trước đây dùng find() nên
  // chức năng thứ hai trở đi lặng lẽ biến mất khỏi trang.
  const available = features.filter((f) => f.available);
  const locked = features.filter((f) => !f.available);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-xl font-heading font-bold">
            Khám phá các công cụ học tập hỗ trợ bạn chinh phục{" "}
            <span className="text-primary-dark">tiếng Trung</span> hiệu quả
          </h1>
          <div className="w-10 h-1 bg-primary rounded-full mx-auto mt-4" />
        </div>

        <div className="space-y-4">
          {/* Các chức năng đang mở */}
          {available.map((feature) => (
            <Link
              key={feature.id}
              to={feature.route}
              className="flex items-center gap-5 bg-white rounded-2xl border border-orange-200 p-5 shadow-[0_10px_28px_-8px_rgba(230,168,0,0.3)] hover:border-primary transition"
            >
              {feature.thumbnail ? (
                <ThumbnailImage
                  src={feature.thumbnail}
                  alt={feature.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0"
                />
              ) : (
                <span className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0 bg-gradient-to-br from-amber-300 to-orange-400 text-white flex items-center justify-center">
                  <SlidesIcon size={40} />
                </span>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-lg font-heading font-semibold text-gray-900">
                  {feature.name} ✨
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {feature.description}
                </p>
                {feature.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {feature.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-gray-700 border border-amber-100 px-3 py-1.5 rounded-full"
                      >
                        {TAG_ICONS[tag]}
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-3 shrink-0">
                <span className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white">
                  <ArrowRightIcon />
                </span>
              </div>
            </Link>
          ))}

          {/* Các card đang phát triển - cần nâng cấp */}
          {locked.map((feature) => {
            const theme = THEME[feature.theme] || THEME.violet;
            return (
              <div
                key={feature.id}
                className="flex items-center gap-5 bg-white rounded-2xl border border-gray-200 p-5 opacity-90 cursor-not-allowed"
              >
                <ThumbnailImage
                  src={feature.thumbnail}
                  alt={feature.name}
                  className={
                    "w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 " +
                    theme.iconBg
                  }
                />

                <div className="flex-1 min-w-0">
                  <p className="text-lg font-medium">{feature.name}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {feature.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={
                      "inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full " +
                      theme.badgeBg +
                      " " +
                      theme.badgeText
                    }
                  >
                    <LockIcon /> Cần nâng cấp
                  </span>
                  <span className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400">
                    <ArrowRightIcon />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Banner nâng cấp */}
        {/* <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200 p-4">
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <GiftIcon /> Nâng cấp tài khoản để mở khóa toàn bộ tính năng học tập
          </span>
          <button className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-sm font-medium px-4 py-2 rounded-full shrink-0">
            <CrownIcon /> Nâng cấp ngay
          </button>
        </div> */}
      </main>
    </div>
  );
}

function HeadphoneIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 14v-2a9 9 0 0118 0v2" strokeLinecap="round" />
      <rect x="3" y="14" width="4" height="7" rx="1.5" />
      <rect x="17" y="14" width="4" height="7" rx="1.5" />
    </svg>
  );
}

function HskExerciseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {/* Tờ đề/tài liệu */}
      <path
        d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Góc gấp của tờ giấy */}
      <path d="M14 3v6h6" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dấu tích — biểu thị bài tập/đề đã làm đúng */}
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="12"
      height="12"
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

function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />
    </svg>
  );
}

function ArrowRightIcon() {
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
        d="M5 12h14M12 5l7 7-7 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </svg>
  );
}

function SlidesIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M12 16v4M8 20h8" strokeLinecap="round" />
      <path d="M7 9h6M7 12h4" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5A2.5 2.5 0 004 22z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17.5h16" strokeLinecap="round" />
    </svg>
  );
}
