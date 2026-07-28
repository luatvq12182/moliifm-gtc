import { Link } from "react-router-dom";
import ConfettiDecorations from "./Confetti.jsx";

export default function ResultSection({
  exerciseResult,
  speakingResult,
  courseId,
  curriculumSlug,
}) {
  const exercisePercent = exerciseResult
    ? Math.round((exerciseResult.correct / exerciseResult.total) * 100)
    : 0;
  const speakingScore = speakingResult?.avgScore ?? 0;

  return (
    <div className="result-lesson relative overflow-hidden rounded-xl border-4 border-orange-300 shadow-[0_12px_32px_-8px_rgba(230,168,0,0.35)] px-5 py-8 mt-4">
      <ConfettiDecorations />

      <div className="relative text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <LeafIcon className="text-amber-300" />
          <h2 className="text-2xl font-heading font-bold text-gray-800">
            Kết quả buổi học
          </h2>
          <LeafIcon className="text-amber-300 scale-x-[-1]" />
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Bạn đã hoàn thành bài học, cùng xem lại kết quả nhé!
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <ResultStatCard
            iconBg="bg-gradient-to-br from-amber-400 to-orange-500"
            icon={<ChecklistIcon />}
            value={exercisePercent}
            suffix="/100"
            valueColor="text-orange-500"
            badgeLabel="Điểm số"
            badgeIcon={<StarIcon />}
            badgeColor="bg-amber-100 text-amber-700"
            footerIcon={<CheckCircleIcon />}
            footerLabel={`${exerciseResult?.correct ?? 0}/${exerciseResult?.total ?? 0} câu đúng`}
          />

          <ResultStatCard
            iconBg="bg-gradient-to-br from-violet-400 to-purple-500"
            icon={<WaveformIcon />}
            value={speakingScore}
            suffix=""
            valueColor="text-purple-500"
            badgeLabel="Điểm phát âm"
            badgeIcon={<SoundIcon />}
            badgeColor="bg-purple-100 text-purple-700"
            footerIcon={<PieIcon />}
            footerLabel={getSpeakingLabel(speakingScore)}
          />
        </div>

        <Link
          to={`/nghe-noi-video-ai/curriculum/${curriculumSlug}/course/${courseId}`}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-medium px-6 py-3 rounded-full shadow-[0_10px_24px_-8px_rgba(234,88,12,0.5)]"
        >
          <RefreshIcon />
          Quay lại danh sách bài học
          <ChevronRightIcon />
        </Link>
      </div>
    </div>
  );
}

function getSpeakingLabel(score) {
  if (score >= 90) return "Xuất sắc";
  if (score >= 70) return "Tốt";
  if (score >= 50) return "Trung bình";
  return "Cần cải thiện";
}

function ResultStatCard({
  iconBg,
  icon,
  value,
  suffix,
  valueColor,
  badgeLabel,
  badgeIcon,
  badgeColor,
  footerIcon,
  footerLabel,
}) {
  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm px-5 py-6">
      <p className={"font-heading font-extrabold leading-none " + valueColor}>
        <span className="text-5xl">{value}</span>
        {suffix && <span className="text-xl text-gray-400">{suffix}</span>}
      </p>

      <span
        className={
          "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full mt-3 " +
          badgeColor
        }
      >
        {badgeIcon} {badgeLabel}
      </span>

      <div className="border-t border-dashed border-gray-200 my-4" />

      <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
        {footerIcon} {footerLabel}
      </div>
    </div>
  );
}

function LeafIcon({ className = "" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2c-4 4-6 9-4 15 5-1 9-5 9-11 0-1.5-.3-3-1-4-1.3 1-2.7 1.5-4 0z" />
    </svg>
  );
}

function TrophyDecoration({ className = "" }) {
  return (
    <svg
      width="90"
      height="90"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path d="M8 4h8v4a4 4 0 01-8 0V4z" fill="url(#trophyGrad)" />
      <path
        d="M6 5H4v2a3 3 0 003 3M18 5h2v2a3 3 0 01-3 3"
        stroke="#F59E0B"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M10 12v3M14 12v3" stroke="#F59E0B" strokeWidth="1.5" />
      <path d="M8 17h8l-1 3H9l-1-3z" fill="#F59E0B" />
      <defs>
        <linearGradient id="trophyGrad" x1="8" y1="4" x2="16" y2="12">
          <stop stopColor="#FCD34D" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ClipboardDecoration({ className = "" }) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect
        x="5"
        y="3"
        width="14"
        height="18"
        rx="2"
        fill="#FFF7ED"
        stroke="#FDBA74"
        strokeWidth="1.5"
      />
      <circle cx="17" cy="17" r="4" fill="#F59E0B" />
      <path
        d="M15.3 17l1.2 1.2 2.2-2.4"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
    >
      <path
        d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WaveformIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
    >
      <path d="M4 12v0M8 8v8M12 4v16M16 8v8M20 12v0" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" />
    </svg>
  );
}

function SoundIcon() {
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
        d="M4 10v4h3l4 4V6l-4 4H4z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 9a4 4 0 010 6" strokeLinecap="round" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#22C55E" />
      <path
        d="M8 12l3 3 5-5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PieIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#A78BFA" />
      <path d="M12 12V4a8 8 0 018 8h-8z" fill="#7C3AED" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
    >
      <path
        d="M4 4v5h5M20 20v-5h-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 15a8 8 0 0014.9 3M20 9A8 8 0 005.1 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
    >
      <polyline
        points="9 6 15 12 9 18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
