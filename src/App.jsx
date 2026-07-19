import { Routes, Route } from 'react-router-dom'
import CourseSelectPage from './pages/CourseSelectPage.jsx'
import LessonListPage from './pages/LessonListPage.jsx'
import LessonDetailPage from './pages/LessonDetailPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CourseSelectPage />} />
      <Route path="/course/:courseId" element={<LessonListPage />} />
      <Route path="/course/:courseId/lesson/:lessonId" element={<LessonDetailPage />} />
    </Routes>
  )
}
