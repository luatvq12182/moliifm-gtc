import { Link } from "react-router-dom";
import { useCurriculaPublicQuery } from "../hooks/usePublicCatalog.js";
import ThumbnailImage from "../components/ThumbnailImage.jsx";
import SiteHeader from "../components/SiteHeader.jsx";

export default function CurriculumSelectPage() {
  const {
    data: curricula = [],
    isLoading,
    isError,
    error,
  } = useCurriculaPublicQuery();

  return (
    <div className="min-h-screen">
      <SiteHeader
        backTo="/"
        backLabel="Chọn khoá học khác"
        title="Luyện Nghe nói qua video AI"
      />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-3">
          Chọn giáo trình
        </h2>

        {isLoading && (
          <p className="text-sm text-gray-400">
            Đang tải danh sách giáo trình...
          </p>
        )}
        {isError && <p className="text-sm text-red-600">{error.message}</p>}

        {!isLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {curricula.map((curriculum) => (
              <Link
                key={curriculum._id}
                to={`/nghe-noi-video-ai/curriculum/${curriculum.slug}`}
                className="block bg-white rounded-xl border border-orange-200 overflow-hidden hover:border-primary transition shadow-[0_10px_28px_-8px_rgba(230,168,0,0.3)]"
              >
                <ThumbnailImage
                  src={curriculum.thumbnail}
                  alt={curriculum.name}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4">
                  <p className="text-lg font-heading font-medium">
                    {curriculum.name}
                  </p>
                  {curriculum.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {curriculum.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {curricula.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full">
                Chưa có giáo trình nào được xuất bản.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
