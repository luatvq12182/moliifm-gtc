import { Link } from 'react-router-dom'

export default function ResultSection({ exerciseResult, speakingResult, courseId }) {
  const exercisePercent = exerciseResult
    ? Math.round((exerciseResult.correct / exerciseResult.total) * 100)
    : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
      <h3 className="text-lg font-medium mb-4">Kết quả buổi học</h3>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-primary/20 rounded-lg py-4">
          <p className="text-2xl font-medium">{exercisePercent}%</p>
          <p className="text-xs text-gray-600 mt-1">
            Trắc nghiệm ({exerciseResult?.correct}/{exerciseResult?.total} câu đúng)
          </p>
        </div>
        <div className="bg-primary/20 rounded-lg py-4">
          <p className="text-2xl font-medium">{speakingResult?.avgScore ?? 0}</p>
          <p className="text-xs text-gray-600 mt-1">Điểm phát âm trung bình</p>
        </div>
      </div>

      <Link
        to={`/course/${courseId}`}
        className="inline-block px-5 py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
      >
        Quay lại danh sách bài học
      </Link>
    </div>
  )
}
