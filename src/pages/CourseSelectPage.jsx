import { Link, useParams } from "react-router-dom";
import {
  useCurriculumPublicQuery,
  useCoursesPublicQuery,
} from "../hooks/usePublicCatalog.js";
import ThumbnailImage from "../components/ThumbnailImage.jsx";
import SiteHeader from "../components/SiteHeader.jsx";

export default function CourseSelectPage() {
  const { curriculumSlug } = useParams();

  const { data: curriculum } = useCurriculumPublicQuery(curriculumSlug);
  const {
    data: courses = [],
    isLoading,
    isError,
    error,
  } = useCoursesPublicQuery(curriculumSlug);

  return (
    <div className="min-h-screen">
      <SiteHeader
        backTo="/nghe-noi-video-ai"
        backLabel="Chọn giáo trình khác"
        title={curriculum ? curriculum.name : "Chọn khóa học"}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-3">
          Chọn khóa học
        </h2>

        {isLoading && (
          <p className="text-sm text-gray-400">
            Đang tải danh sách khóa học...
          </p>
        )}
        {isError && <p className="text-sm text-red-600">{error.message}</p>}

        {!isLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {courses.map((course) => (
              <Link
                key={course._id}
                to={`/nghe-noi-video-ai/curriculum/${curriculumSlug}/course/${course.slug}`}
                className="block bg-white rounded-xl border border-orange-200 overflow-hidden hover:border-primary transition shadow-[0_10px_28px_-8px_rgba(230,168,0,0.3)]"
              >
                <ThumbnailImage
                  src={course.thumbnail}
                  alt={course.name}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4">
                  <p className="text-lg font-heading font-medium">
                    {course.name}
                  </p>
                  {course.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {course.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {courses.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full">
                Giáo trình này chưa có khóa học nào được xuất bản.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
