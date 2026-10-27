import { Link, useParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader.jsx";
import { useMyMaterialCourse } from "../../hooks/useMaterials.js";

/** Học liệu khoá học — danh sách bộ slide của một khoá. */
export default function MaterialDeckListPage() {
  const { courseSlug } = useParams();
  const { data, isLoading, isError, error } = useMyMaterialCourse(courseSlug);
  const course = data?.course;
  const decks = data?.decks || [];

  return (
    <div className="min-h-screen">
      <SiteHeader backTo="/hoc-lieu" backLabel="Chọn khoá khác" title={course ? course.name : "Học liệu"} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
        {isError && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-700">{error.message}</p>
            <Link to="/hoc-lieu" className="inline-block mt-3 text-sm text-primary-dark underline">
              Quay lại danh sách khoá
            </Link>
          </div>
        )}

        {course && (
          <>
            <h2 className="text-xl font-bold">{course.name}</h2>
            {course.description && <p className="text-sm text-gray-500 mt-1">{course.description}</p>}
            <p className="text-sm text-gray-500 mt-3 mb-3">{decks.length} bài giảng</p>

            {decks.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-500">
                Khoá này chưa có bài giảng nào. Giảng viên sẽ cập nhật sớm.
              </div>
            )}

            <div className="space-y-3">
              {decks.map((d, i) => (
                <Link
                  key={d._id}
                  to={`/hoc-lieu/${courseSlug}/${d._id}`}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-orange-200 p-4 hover:border-primary transition shadow-[0_6px_20px_-6px_rgba(230,168,0,0.25)]"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-heading font-semibold text-lg shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-900">{d.title}</p>
                    {d.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{d.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{d.pageCount} trang</p>
                  </div>
                  <span className="shrink-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-medium px-4 py-2 rounded-full">
                    Xem
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
