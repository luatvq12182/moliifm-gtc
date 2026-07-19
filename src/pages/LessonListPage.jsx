import { Link, useParams } from "react-router-dom";
import { courses, lessons } from "../data/courses.js";
import ThumbnailImage from "../components/ThumbnailImage.jsx";

export default function LessonListPage() {
  const { courseId } = useParams();
  const course = courses.find((c) => c.id === courseId);
  const lessonList = lessons[courseId] || [];

  return (
    <div className="min-h-screen">
      <header className="bg-primary px-4 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-gray-800 hover:underline"
        >
          <ArrowLeftIcon /> Chọn khóa học khác
        </Link>
        <h1 className="text-2xl font-heading font-semibold text-gray-900 mt-1">
          {course ? course.name : "Khóa học"}
        </h1>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:grid lg:grid-cols-[400px_1fr] lg:gap-6 lg:items-start">
        {/* Cột trái: thẻ khóa học */}
        <div className="lg:sticky lg:top-6 mb-6 lg:mb-0">
          <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-[0_12px_32px_-8px_rgba(230,168,0,0.35)]">
            <ThumbnailImage
              src={course?.thumbnail}
              alt={course?.name}
              className="w-full aspect-square object-cover"
            />
            <div className="p-4">
              <p className="text-2xl font-heading font-semibold">
                {course?.name}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {course?.description}
              </p>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                <StatItem
                  icon={<BookIcon />}
                  label="Cấp độ"
                  value={course?.level}
                />
                <StatItem
                  icon={<ClockIcon />}
                  label="Số bài học"
                  value={`${course?.totalLessons} bài`}
                />
                <StatItem
                  icon={<BadgeIcon />}
                  label="Chứng chỉ"
                  value={course?.certificate}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: danh sách bài học */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <StarIcon />
            </span>
            <h2 className="text-lg font-heading font-semibold">Chọn bài học</h2>
          </div>

          <div className="space-y-3">
            {lessonList.map((lesson, index) => {
              const number = String(index + 1).padStart(2, "0");

              return lesson.available ? (
                <Link
                  key={lesson.id}
                  to={`/course/${courseId}/lesson/${lesson.id}`}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-orange-200 p-4 hover:border-primary transition shadow-[0_6px_20px_-6px_rgba(230,168,0,0.25)]"
                >
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-white font-heading font-semibold text-lg">
                      {number}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                      <CheckIcon />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium">{lesson.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {lesson.description}
                    </p>
                  </div>

                  <span className="shrink-0 inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-[0_6px_16px_-4px_rgba(234,88,12,0.5)]">
                    Học ngay <ArrowRightIcon />
                  </span>
                </Link>
              ) : (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-4 opacity-70 cursor-not-allowed shadow-[0_4px_14px_-6px_rgba(230,168,0,0.15)]"
                >
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400 font-heading font-semibold text-lg">
                      {number}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                      <LockIcon />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium">{lesson.title}</p>
                    <p className="text-sm text-gray-400 mt-0.5">Sắp ra mắt</p>
                  </div>

                  <span className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <LockIcon />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatItem({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <span className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary-dark">
        {icon}
      </span>
      <span className="text-[11px] text-gray-400 leading-none">{label}</span>
      <span className="text-xs font-medium leading-none">{value}</span>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="14"
      height="14"
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

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#16a34a"
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

function LockIcon() {
  return (
    <svg
      width="13"
      height="13"
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

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
      <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V4H6.5A2.5 2.5 0 004 6.5v13z" />
    </svg>
  );
}

function ClockIcon() {
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
      <path d="M12 7v5l3 3" strokeLinecap="round" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M8.5 12.5L7 22l5-3 5 3-1.5-9.5" />
    </svg>
  );
}
