import { Link } from 'react-router-dom'
import { courses } from '../data/courses.js'
import ThumbnailImage from '../components/ThumbnailImage.jsx'

export default function CourseSelectPage() {
  return (
    <div className="min-h-screen">
      <header className="bg-primary px-4 py-4">
        <img className='w-24' src="/images/logo-moliifm.png" alt="" />
        {/* <h1 className="text-lg font-semibold text-gray-900">Luyện nghe nói giao tiếp 2.0</h1> */}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-3xl font-heading font-medium text-gray-500 mb-3">Chọn khóa học</h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {courses.map((course) =>
            course.available ? (
              <Link
                key={course.id}
                to={`/course/${course.id}`}
                className="block bg-white rounded-xl border border-orange-200 overflow-hidden hover:border-primary transition shadow-[0_12px_32px_-8px_rgba(230,168,0,0.35)]"
              >
                <ThumbnailImage
                  src={course.thumbnail}
                  alt={course.name}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4">
                  <p className="text-2xl font-heading font-medium">{course.name}</p>
                  <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                </div>
              </Link>
            ) : (
              <div
                key={course.id}
                className="block bg-white rounded-xl border border-gray-200 overflow-hidden opacity-60 cursor-not-allowed"
              >
                <ThumbnailImage
                  src={course.thumbnail}
                  alt={course.name}
                  className="w-full aspect-square object-cover grayscale"
                />
                <div className="p-4">
                  <p className="text-2xl font-heading font-medium">{course.name}</p>
                  <p className="text-sm text-gray-500 mt-1">Sắp ra mắt</p>
                </div>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}
