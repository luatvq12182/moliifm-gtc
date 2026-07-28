import ConfettiDecorations from './Confetti.jsx'

export default function ExerciseResultCard({ correct, total }) {
  const percent = Math.round((correct / total) * 100);
  const wrong = total - correct;
  const message = getFeedbackMessage(percent);

  return (
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
          <StatCard
            icon={<XIcon />}
            iconBg="bg-red-100 text-red-500"
            label="Số câu sai"
            value={wrong}
            valueColor="text-blue-500"
          />
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
