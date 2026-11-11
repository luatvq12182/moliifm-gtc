import { Link } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader.jsx";
import ThumbnailImage from "../../components/ThumbnailImage.jsx";
import { useMyExamLevels } from "../../hooks/useExam.js";

/**
 * Luyện thi HSK 3.0 — chọn cấp thi (HSK3, HSK4…). Chỉ hiện cấp học viên ĐƯỢC
 * CẤP QUYỀN (giống học liệu: ẩn hẳn cấp chưa mua).
 */
export default function ExamLevelSelectPage() {
  const { data: levels = [], isLoading, isError, error } = useMyExamLevels();

  return (
    <div className="min-h-screen">
      <SiteHeader backTo="/" backLabel="Trang chủ" title="Luyện thi HSK 3.0" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-1">Chọn cấp thi</h2>
        <p className="text-sm text-gray-500 mb-4">Video hướng dẫn kỹ năng thi và luyện đề thi thử HSK 3.0.</p>

        {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
        {isError && <p className="text-sm text-red-600">{error.message}</p>}

        {!isLoading && !isError && levels.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-700 font-medium">Bạn chưa được cấp quyền vào phần luyện thi nào.</p>
            <p className="text-sm text-gray-500 mt-1">Vui lòng liên hệ trung tâm để được mở cấp thi bạn đang ôn luyện.</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {levels.map((l) => (
            <Link
              key={l._id}
              to={`/luyen-thi/${l.slug}`}
              className="block bg-white rounded-2xl border border-orange-200 overflow-hidden hover:border-primary transition shadow-[0_10px_28px_-8px_rgba(230,168,0,0.3)]"
            >
              {l.thumbnail ? (
                <ThumbnailImage src={l.thumbnail} alt={l.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center p-3 text-center">
                  <span className="text-2xl sm:text-3xl font-heading font-bold text-white drop-shadow">{l.name}</span>
                </div>
              )}
              <div className="p-3 sm:p-4">
                <p className="text-base sm:text-lg font-heading font-semibold text-gray-900">{l.name}</p>
                {l.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{l.description}</p>}
                <p className="text-xs text-primary-dark font-medium mt-2">
                  {[l.videoCount > 0 && `${l.videoCount} video kỹ năng`, l.testCount > 0 && `${l.testCount} đề luyện`].filter(Boolean).join(" · ") || "Đang cập nhật"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
