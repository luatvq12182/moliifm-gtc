import { Link, useSearchParams } from "react-router-dom";
import { useCurriculaQuery } from "../../hooks/useCurricula.js";
import { useCoursesQuery } from "../../hooks/useCourses.js";
import {
  useLessonsQuery,
  useToggleLessonStatus,
  useDeleteLesson,
} from "../../hooks/useLessons.js";

export default function AdminLessonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const curriculumId = searchParams.get("curriculumId") || "";
  const courseId = searchParams.get("courseId") || "";

  const { data: curricula = [] } = useCurriculaQuery();
  const { data: courses = [] } = useCoursesQuery(curriculumId);
  const {
    data: lessons = [],
    isLoading,
    isError,
    error,
  } = useLessonsQuery(courseId);

  const toggleStatus = useToggleLessonStatus();
  const deleteLesson = useDeleteLesson();

  const handleCurriculumChange = (e) => {
    const id = e.target.value;
    setSearchParams(id ? { curriculumId: id } : {});
  };

  const handleCourseChange = (e) => {
    const id = e.target.value;
    setSearchParams(id ? { curriculumId, courseId: id } : { curriculumId });
  };

  const handleToggleStatus = (lesson) => {
    toggleStatus.mutate(lesson._id);
  };

  const handleDelete = (lesson) => {
    if (
      !confirm(
        `Xóa bài học "${lesson.title}"? Hành động này không thể hoàn tác.`,
      )
    )
      return;
    deleteLesson.mutate(lesson._id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-heading font-semibold">Bài học</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quản lý nội dung từng bài: hội thoại, từ vựng, bài tập, luyện nói
          </p>
        </div>
        {courseId && (
          <Link
            to={`/admin/gtc/lessons/new?courseId=${courseId}`}
            className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg shrink-0 text-center"
          >
            + Thêm bài học
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm text-gray-500 shrink-0">Giáo trình:</label>
        <select
          value={curriculumId}
          onChange={handleCurriculumChange}
          className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">-- Chọn giáo trình --</option>
          {curricula.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
              {c.status === "draft" ? " (bản nháp)" : ""}
            </option>
          ))}
        </select>

        <label className="text-sm text-gray-500 shrink-0">Khóa học:</label>
        <select
          value={courseId}
          onChange={handleCourseChange}
          disabled={!curriculumId}
          className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">-- Chọn khóa học --</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
              {c.status === "draft" ? " (bản nháp)" : ""}
            </option>
          ))}
        </select>
      </div>

      {!courseId && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          Chọn giáo trình và khóa học ở trên để xem/quản lý danh sách bài học.
        </div>
      )}

      {courseId && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {isLoading && (
            <p className="p-4 text-sm text-gray-400">
              Đang tải danh sách bài học...
            </p>
          )}
          {isError && (
            <p className="p-4 text-sm text-red-600">{error.message}</p>
          )}

          {!isLoading && (
            <div className="divide-y divide-gray-50">
              {lessons.map((l, index) => (
                <div key={l._id} className="p-4 flex items-center gap-4">
                  <span className="w-9 h-9 rounded-lg bg-primary/20 text-primary-dark font-heading font-semibold flex items-center justify-center text-xs shrink-0">
                    {String(l.order || index + 1).padStart(2, "0")}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{l.title}</p>
                    {l.description && (
                      <p className="text-xs text-gray-400 truncate">
                        {l.description}
                      </p>
                    )}
                  </div>

                  <span
                    className={
                      "shrink-0 text-xs font-medium px-2.5 py-1 rounded-full " +
                      (l.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700")
                    }
                  >
                    {l.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                  </span>

                  <div className="shrink-0 flex items-center gap-2 text-xs">
                    <Link
                      to={`/admin/gtc/lessons/${l._id}/edit`}
                      className="text-primary-dark hover:underline"
                    >
                      Sửa nội dung
                    </Link>
                    <span className="text-gray-300">·</span>
                    <button
                      onClick={() => handleToggleStatus(l)}
                      className="text-gray-600 hover:underline"
                    >
                      {l.status === "published" ? "Ẩn" : "Xuất bản"}
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      onClick={() => handleDelete(l)}
                      className="text-red-500 hover:underline"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}

              {lessons.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">
                  Chưa có bài học nào trong khóa này.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
