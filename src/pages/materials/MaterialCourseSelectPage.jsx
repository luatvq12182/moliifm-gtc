import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader.jsx";
import ThumbnailImage from "../../components/ThumbnailImage.jsx";
import { useMyMaterialCourses } from "../../hooks/useMaterials.js";

/**
 * Học liệu khoá học — chọn khoá. Chỉ hiện khoá học viên ĐƯỢC CẤP QUYỀN (khách
 * chốt ẩn hẳn khoá chưa mua, không hiện dạng mờ).
 */
export default function MaterialCourseSelectPage() {
  const { data: courses = [], isLoading, isError, error } = useMyMaterialCourses();

  return (
    <div className="min-h-screen">
      <SiteHeader backTo="/" backLabel="Trang chủ" title="Học liệu khoá học" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-1">Chọn khoá học</h2>
        <p className="text-sm text-gray-500 mb-4">Slide bài giảng của các khoá bạn đang theo học tại trung tâm.</p>

        {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
        {isError && <p className="text-sm text-red-600">{error.message}</p>}

        {!isLoading && !isError && courses.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-700 font-medium">Bạn chưa được cấp quyền xem học liệu khoá nào.</p>
            <p className="text-sm text-gray-500 mt-1">Vui lòng liên hệ trung tâm để được mở học liệu của khoá bạn đang học.</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {courses.map((c) => (
            <Link
              key={c._id}
              to={`/hoc-lieu/${c.slug}`}
              className="block bg-white rounded-2xl border border-orange-200 overflow-hidden hover:border-primary transition shadow-[0_10px_28px_-8px_rgba(230,168,0,0.3)]"
            >
              {c.thumbnail ? (
                <ThumbnailImage src={c.thumbnail} alt={c.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center p-3 text-center">
                  <span className="text-2xl sm:text-3xl font-heading font-bold text-white drop-shadow">{c.name}</span>
                </div>
              )}
              <div className="p-3 sm:p-4">
                <p className="text-base sm:text-lg font-heading font-semibold text-gray-900">{c.name}</p>
                {c.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description}</p>}
                <p className="text-xs text-primary-dark font-medium mt-2">{c.deckCount} bài giảng</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
