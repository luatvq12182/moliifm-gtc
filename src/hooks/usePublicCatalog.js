import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

// Hook cho các API công khai (học viên xem, không cần đăng nhập).
// File này sẽ phình thêm ở các bước sau: useCoursesPublicQuery,
// useLessonsPublicQuery, useLessonPublicQuery... khi ta nối tiếp Khóa học
// và Bài học vào dữ liệu thật.
export function useCurriculaPublicQuery() {
    return useQuery({
        queryKey: ['public-curricula'],
        queryFn: () => api.get('/curricula'),
    })
}

export function useCurriculumPublicQuery(slug) {
    return useQuery({
        queryKey: ['public-curriculum', slug],
        queryFn: () => api.get(`/curricula/${slug}`),
        enabled: Boolean(slug),
    })
}

export function useCoursesPublicQuery(curriculumSlug) {
    return useQuery({
        queryKey: ['public-courses', curriculumSlug],
        queryFn: () => api.get(`/curricula/${curriculumSlug}/courses`),
        enabled: Boolean(curriculumSlug),
    })
}

export function useCoursePublicQuery(curriculumSlug, courseSlug) {
    return useQuery({
        queryKey: ['public-course', curriculumSlug, courseSlug],
        queryFn: () => api.get(`/curricula/${curriculumSlug}/courses/${courseSlug}`),
        enabled: Boolean(curriculumSlug && courseSlug),
    })
}

export function useLessonsPublicQuery(curriculumSlug, courseSlug) {
    return useQuery({
        queryKey: ['public-lessons', curriculumSlug, courseSlug],
        queryFn: () => api.get(`/curricula/${curriculumSlug}/courses/${courseSlug}/lessons`),
        enabled: Boolean(curriculumSlug && courseSlug),
    })
}

export function useLessonPublicQuery(curriculumSlug, courseSlug, lessonSlug) {
    return useQuery({
        queryKey: ['public-lesson', curriculumSlug, courseSlug, lessonSlug],
        queryFn: () => api.get(`/curricula/${curriculumSlug}/courses/${courseSlug}/lessons/${lessonSlug}`),
        enabled: Boolean(curriculumSlug && courseSlug && lessonSlug),
    })
}
