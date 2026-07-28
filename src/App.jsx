import { Routes, Route, Navigate } from "react-router-dom";
import FeatureSelectPage from "./pages/FeatureSelectPage.jsx";
import CourseSelectPage from "./pages/CourseSelectPage.jsx";
import LessonListPage from "./pages/LessonListPage.jsx";
import LessonDetailPage from "./pages/LessonDetailPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminStudentsPage from "./pages/admin/AdminStudentsPage.jsx";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute.jsx";
import AdminCurriculaPage from "./pages/admin/AdminCurriculaPage.jsx";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage.jsx";
import AdminLessonsPage from "./pages/admin/AdminLessonsPage.jsx";
import AdminLessonEditPage from "./pages/admin/AdminLessonEditPage.jsx";
import CurriculumSelectPage from "./pages/CurriculumSelectPage.jsx";
import ProtectedStudentRoute from "./components/ProtectedStudentRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedStudentRoute>
            <FeatureSelectPage />
          </ProtectedStudentRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/nghe-noi-video-ai"
        element={
          <ProtectedStudentRoute>
            <CurriculumSelectPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/nghe-noi-video-ai/curriculum/:curriculumSlug"
        element={
          <ProtectedStudentRoute>
            <CourseSelectPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/nghe-noi-video-ai/curriculum/:curriculumSlug/course/:courseId"
        element={
          <ProtectedStudentRoute>
            <LessonListPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/nghe-noi-video-ai/curriculum/:curriculumSlug/course/:courseId/lesson/:lessonId"
        element={
          <ProtectedStudentRoute>
            <LessonDetailPage />
          </ProtectedStudentRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="gtc/curricula" element={<AdminCurriculaPage />} />
        <Route path="gtc/courses" element={<AdminCoursesPage />} />
        <Route path="gtc/lessons" element={<AdminLessonsPage />} />
        <Route path="gtc/lessons/new" element={<AdminLessonEditPage />} />
        <Route path="gtc/lessons/:id/edit" element={<AdminLessonEditPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
