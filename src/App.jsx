import { Routes, Route, Navigate } from "react-router-dom";
import FeatureSelectPage from "./pages/FeatureSelectPage.jsx";
import CourseSelectPage from "./pages/CourseSelectPage.jsx";
import LessonListPage from "./pages/LessonListPage.jsx";
import LessonDetailPage from "./pages/LessonDetailPage.jsx";
import ChangePasswordPage from "./pages/ChangePasswordPage.jsx";
import LessonHistoryPage from "./pages/LessonHistoryPage.jsx";
import LessonHistoryDetailPage from "./pages/LessonHistoryDetailPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminStudentsPage from "./pages/admin/AdminStudentsPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute.jsx";
import AdminCurriculaPage from "./pages/admin/AdminCurriculaPage.jsx";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage.jsx";
import AdminLessonsPage from "./pages/admin/AdminLessonsPage.jsx";
import AdminLessonEditPage from "./pages/admin/AdminLessonEditPage.jsx";
import CurriculumSelectPage from "./pages/CurriculumSelectPage.jsx";
import ProtectedStudentRoute from "./components/ProtectedStudentRoute.jsx";
import MaterialCourseSelectPage from "./pages/materials/MaterialCourseSelectPage.jsx";
import MaterialDeckListPage from "./pages/materials/MaterialDeckListPage.jsx";
import MaterialViewerPage from "./pages/materials/MaterialViewerPage.jsx";
import MaterialVideoPage from "./pages/materials/MaterialVideoPage.jsx";
import MaterialExercisePage from "./pages/materials/MaterialExercisePage.jsx";
import AdminMaterialCoursesPage from "./pages/admin/materials/AdminMaterialCoursesPage.jsx";
import AdminMaterialDecksPage from "./pages/admin/materials/AdminMaterialDecksPage.jsx";
import AdminMaterialAccessPage from "./pages/admin/materials/AdminMaterialAccessPage.jsx";
import AdminMaterialVideosPage from "./pages/admin/materials/AdminMaterialVideosPage.jsx";
import AdminMaterialExercisePage from "./pages/admin/materials/AdminMaterialExercisePage.jsx";
import AdminAiGradingPage from "./pages/admin/materials/AdminAiGradingPage.jsx";
import ExamLevelSelectPage from "./pages/exam/ExamLevelSelectPage.jsx";
import ExamLevelPage from "./pages/exam/ExamLevelPage.jsx";
import ExamVideoPage from "./pages/exam/ExamVideoPage.jsx";
import ExamTestIntroPage from "./pages/exam/ExamTestIntroPage.jsx";
import ExamTakePage from "./pages/exam/ExamTakePage.jsx";
import AdminExamLevelsPage from "./pages/admin/exam/AdminExamLevelsPage.jsx";
import AdminExamVideosPage from "./pages/admin/exam/AdminExamVideosPage.jsx";
import AdminExamAccessPage from "./pages/admin/exam/AdminExamAccessPage.jsx";
import AdminExamTestsPage from "./pages/admin/exam/AdminExamTestsPage.jsx";
import AdminExamTestEditPage from "./pages/admin/exam/AdminExamTestEditPage.jsx";
import AdminExamResultsPage from "./pages/admin/exam/AdminExamResultsPage.jsx";
import AdminExamResultDetailPage from "./pages/admin/exam/AdminExamResultDetailPage.jsx";

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
        path="/lich-su-hoc"
        element={
          <ProtectedStudentRoute>
            <LessonHistoryPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/lich-su-hoc/:id"
        element={
          <ProtectedStudentRoute>
            <LessonHistoryDetailPage />
          </ProtectedStudentRoute>
        }
      />

      <Route
        path="/hoc-lieu"
        element={
          <ProtectedStudentRoute>
            <MaterialCourseSelectPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/hoc-lieu/:courseSlug"
        element={
          <ProtectedStudentRoute>
            <MaterialDeckListPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/hoc-lieu/:courseSlug/bai-tap"
        element={
          <ProtectedStudentRoute>
            <MaterialExercisePage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/hoc-lieu/:courseSlug/video/:videoId"
        element={
          <ProtectedStudentRoute>
            <MaterialVideoPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/hoc-lieu/:courseSlug/:deckId"
        element={
          <ProtectedStudentRoute>
            <MaterialViewerPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/luyen-thi"
        element={
          <ProtectedStudentRoute>
            <ExamLevelSelectPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/luyen-thi/:levelSlug"
        element={
          <ProtectedStudentRoute>
            <ExamLevelPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/luyen-thi/:levelSlug/de/:testId"
        element={
          <ProtectedStudentRoute>
            <ExamTestIntroPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/luyen-thi/:levelSlug/lam-bai/:attemptId"
        element={
          <ProtectedStudentRoute>
            <ExamTakePage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/luyen-thi/:levelSlug/video/:videoId"
        element={
          <ProtectedStudentRoute>
            <ExamVideoPage />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/doi-mat-khau"
        element={
          <ProtectedStudentRoute>
            <ChangePasswordPage />
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
        <Route index element={<AdminDashboardPage />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="gtc/curricula" element={<AdminCurriculaPage />} />
        <Route path="gtc/courses" element={<AdminCoursesPage />} />
        <Route path="gtc/lessons" element={<AdminLessonsPage />} />
        <Route path="gtc/lessons/new" element={<AdminLessonEditPage />} />
        <Route path="gtc/lessons/:id/edit" element={<AdminLessonEditPage />} />
        <Route path="materials/courses" element={<AdminMaterialCoursesPage />} />
        <Route path="materials/decks" element={<AdminMaterialDecksPage />} />
        <Route path="materials/videos" element={<AdminMaterialVideosPage />} />
        <Route path="materials/courses/:courseId/exercise" element={<AdminMaterialExercisePage />} />
        <Route path="materials/access" element={<AdminMaterialAccessPage />} />
        <Route path="materials/ai-grading" element={<AdminAiGradingPage />} />
        <Route path="exam/levels" element={<AdminExamLevelsPage />} />
        <Route path="exam/videos" element={<AdminExamVideosPage />} />
        <Route path="exam/tests" element={<AdminExamTestsPage />} />
        <Route path="exam/tests/:id" element={<AdminExamTestEditPage />} />
        <Route path="exam/results" element={<AdminExamResultsPage />} />
        <Route path="exam/results/:id" element={<AdminExamResultDetailPage />} />
        <Route path="exam/access" element={<AdminExamAccessPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
