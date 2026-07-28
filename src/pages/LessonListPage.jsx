import { Link, useParams } from "react-router-dom";
import {
  useCoursePublicQuery,
  useLessonsPublicQuery,
} from "../hooks/usePublicCatalog.js";
import ThumbnailImage from "../components/ThumbnailImage.jsx";
import SiteHeader from "../components/SiteHeader.jsx";

export default function LessonListPage() {
  // Lưu ý: param tên là "courseId" (giữ nguyên từ route cũ) nhưng giá trị thật
  // sự bây giờ là course SLUG (vd. "hsk1"), không phải ObjectId của MongoDB —
  // vì API public định danh mọi thứ theo slug lồng nhau, không theo _id.
  const { curriculumSlug, courseId } = useParams();

  const { data: course, isLoading: loadingCourse } = useCoursePublicQuery(
    curriculumSlug,
    courseId,
  );
  const {
    data: lessons = [],
    isLoading,
    isError,
    error,
  } = useLessonsPublicQuery(curriculumSlug, courseId);

  return (
    <div className="min-h-screen">
      <SiteHeader
        backTo={`/nghe-noi-video-ai/curriculum/${curriculumSlug}`}
        backLabel="Chọn khóa học khác"
        title={course ? course.name : "Khóa học"}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col lg:grid lg:grid-cols-[320px_1fr] lg:gap-6 lg:items-start">
        <div className="lg:sticky lg:top-6 mb-6 lg:mb-0">
          <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-[0_12px_32px_-8px_rgba(230,168,0,0.35)]">
            <ThumbnailImage
              src={course?.thumbnail}
              alt={course?.name}
              className="w-full aspect-square object-cover"
            />
            <div className="p-4">
              <p className="text-lg font-heading font-semibold">
                {course?.name}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {course?.description}
              </p>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                <StatItem
                  icon={<BookIcon />}
                  label="Cấp độ"
                  value={course?.level || "—"}
                />
                <StatItem
                  icon={<ClockIcon />}
                  label="Số bài học"
                  value={`${lessons.length} bài`}
                />
                <StatItem
                  icon={<BadgeIcon />}
                  label="Đạt trình độ"
                  value={course?.certificate || "—"}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <StarIcon />
            </span>
            <h2 className="text-lg font-heading font-semibold">Chọn bài học</h2>
          </div>

          {(isLoading || loadingCourse) && (
            <p className="text-sm text-gray-400">
              Đang tải danh sách bài học...
            </p>
          )}
          {isError && <p className="text-sm text-red-600">{error.message}</p>}

          {!isLoading && !isError && (
            <div className="space-y-3">
              {lessons.map((lesson, index) => (
                <Link
                  key={lesson._id}
                  to={`/nghe-noi-video-ai/curriculum/${curriculumSlug}/course/${courseId}/lesson/${lesson.slug}`}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-orange-200 p-4 hover:border-primary transition shadow-[0_6px_20px_-6px_rgba(230,168,0,0.25)]"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-white font-heading font-semibold text-lg shrink-0">
                    {String(lesson.order || index + 1).padStart(2, "0")}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium">{lesson.title}</p>
                    {lesson.description && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {lesson.description}
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-sm font-medium px-4 py-2 rounded-full">
                    Học ngay <ArrowRightIcon />
                  </span>
                </Link>
              ))}

              {lessons.length === 0 && (
                <p className="text-sm text-gray-400">
                  Khóa học này chưa có bài học nào được xuất bản.
                </p>
              )}
            </div>
          )}
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
