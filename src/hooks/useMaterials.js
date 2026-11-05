import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

/**
 * "Học liệu khoá học" — truy vấn cho học viên và quản trị.
 *
 * Khoá truy vấn khai một chỗ (cùng lý do đã ghi trong useStudents.js).
 */
export const MATERIALS_KEY = ['materials']
export const ADMIN_MATERIALS_KEY = ['admin-materials']

// ---------- học viên ----------

export function useMyMaterialCourses() {
    return useQuery({
        queryKey: [...MATERIALS_KEY, 'courses'],
        queryFn: () => api.get('/materials/courses'),
    })
}

export function useMyMaterialCourse(slug) {
    return useQuery({
        queryKey: [...MATERIALS_KEY, 'course', slug],
        queryFn: () => api.get(`/materials/courses/${slug}`),
        enabled: Boolean(slug),
        retry: (count, err) => err?.status !== 403 && err?.status !== 404 && count < 2,
    })
}

export function useMyDeck(id) {
    return useQuery({
        queryKey: [...MATERIALS_KEY, 'deck', id],
        queryFn: () => api.get(`/materials/decks/${id}`),
        enabled: Boolean(id),
        retry: (count, err) => err?.status !== 403 && err?.status !== 404 && count < 2,
    })
}

/** Đường dẫn ảnh một trang (n đếm từ 1) — phía học viên. */
export const myDeckPagePath = (deckId, n) => `/materials/decks/${deckId}/pages/${n}`

export function useMyVideo(id) {
    return useQuery({
        queryKey: [...MATERIALS_KEY, 'video', id],
        queryFn: () => api.get(`/materials/videos/${id}`),
        enabled: Boolean(id),
        // Mở lại video phải lấy chỗ đang xem MỚI NHẤT, không dùng bản cũ trong bộ nhớ.
        staleTime: 0,
        gcTime: 0,
        retry: (count, err) => err?.status !== 403 && err?.status !== 404 && count < 2,
    })
}

export const myVideoThumbPath = (videoId) => `/materials/videos/${videoId}/thumb`
export const myVideoProgressPath = (videoId) => `/materials/videos/${videoId}/progress`

/** Bài tập của khoá. Chưa xem đủ mọi video của khoá -> lỗi 403 mã VIDEO_NOT_WATCHED. */
export function useMyExercise(courseSlug) {
    return useQuery({
        queryKey: [...MATERIALS_KEY, 'exercise', courseSlug],
        queryFn: () => api.get(`/materials/courses/${courseSlug}/exercise`),
        enabled: Boolean(courseSlug),
        staleTime: 0,
        retry: (count, err) => ![403, 404].includes(err?.status) && count < 2,
    })
}

/** Nộp bài — máy chủ chấm ngay (phần đặt câu do AI chấm, mất vài giây). */
export function useSubmitExercise(courseSlug) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (answers) => api.post(`/materials/courses/${courseSlug}/exercise/attempts`, { answers }),
        onSuccess: () => qc.invalidateQueries({ queryKey: MATERIALS_KEY }),
    })
}

export function useRegradeAttempt() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (attemptId) => api.post(`/materials/exercise-attempts/${attemptId}/regrade`, {}),
        onSuccess: () => qc.invalidateQueries({ queryKey: MATERIALS_KEY }),
    })
}

// ---------- quản trị ----------

export const adminCoursesKey = () => [...ADMIN_MATERIALS_KEY, 'courses']
export const adminDecksKey = (courseId) => [...ADMIN_MATERIALS_KEY, 'decks', courseId]
export const adminAccessKey = (params) => [...ADMIN_MATERIALS_KEY, 'access', params]
export const adminVideosKey = (courseId) => [...ADMIN_MATERIALS_KEY, 'videos', courseId]

/** Đường dẫn ảnh một trang — phía quản trị (xem trước). */
export const adminDeckPagePath = (deckId, n) => `/admin/materials/decks/${deckId}/pages/${n}`

export function useAdminMaterialCourses() {
    return useQuery({
        queryKey: adminCoursesKey(),
        queryFn: () => api.get('/admin/materials/courses'),
    })
}

function useInvalidatingMutation(mutationFn) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn,
        onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_MATERIALS_KEY }),
    })
}

export const useSaveMaterialCourse = () =>
    useInvalidatingMutation(({ id, payload }) =>
        id ? api.put(`/admin/materials/courses/${id}`, payload) : api.post('/admin/materials/courses', payload),
    )

export const useDeleteMaterialCourse = () =>
    useInvalidatingMutation(({ id, force }) => api.del(`/admin/materials/courses/${id}${force ? '?force=1' : ''}`))

/**
 * Bộ slide của một khoá. Có bộ nào đang chuyển đổi thì tự hỏi lại mỗi 2 giây
 * cho tới khi xong — giảng viên không phải tự bấm tải lại trang.
 */
export function useAdminDecks(courseId) {
    return useQuery({
        queryKey: adminDecksKey(courseId),
        queryFn: () => api.get(`/admin/materials/decks?courseId=${courseId}`),
        enabled: Boolean(courseId),
        refetchInterval: (query) =>
            (query.state.data || []).some((d) => d.conversion === 'processing') ? 2000 : false,
    })
}

export function useUploadDeck() {
    const qc = useQueryClient()
    return useMutation({
        // { courseId, file, title, status, deckId (thay file), onProgress }
        mutationFn: ({ courseId, file, title, status, deckId, onProgress }) => {
            const form = new FormData()
            if (!deckId) {
                form.append('courseId', courseId)
                if (title) form.append('title', title)
                if (status) form.append('status', status)
            }
            form.append('file', file)
            return api.uploadForm(
                deckId ? `/admin/materials/decks/${deckId}/file` : '/admin/materials/decks',
                form,
                { onProgress },
            )
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_MATERIALS_KEY }),
    })
}

/** Thêm bộ slide từ link Google Slides (máy chủ tự lấy bản PDF). */
export const useAddGoogleDeck = () =>
    useInvalidatingMutation((payload) => api.post('/admin/materials/decks/google', payload))

/** Lấy lại bản mới nhất từ Google Slides cho một bộ slide. */
export const useSyncGoogleDeck = () =>
    useInvalidatingMutation((id) => api.post(`/admin/materials/decks/${id}/sync`, {}))

export const useUpdateDeck = () =>
    useInvalidatingMutation(({ id, payload }) => api.put(`/admin/materials/decks/${id}`, payload))

export const useRetryDeck = () => useInvalidatingMutation((id) => api.post(`/admin/materials/decks/${id}/retry`))

export const useDeleteDeck = () => useInvalidatingMutation((id) => api.del(`/admin/materials/decks/${id}`))

export const useReorderDecks = () =>
    useInvalidatingMutation(({ courseId, ids }) => api.put('/admin/materials/decks/reorder', { courseId, ids }))

// ---------- video bài giảng (quản trị) ----------

export const adminVideoThumbPath = (videoId) => `/admin/materials/videos/${videoId}/thumb`

export function useAdminVideos(courseId) {
    return useQuery({
        queryKey: adminVideosKey(courseId),
        queryFn: () => api.get(`/admin/materials/videos?courseId=${courseId}`),
        enabled: Boolean(courseId),
    })
}

/** Thêm video từ link YouTube — máy chủ đọc tên + thời lượng ngay. */
export const useAddVideo = () => useInvalidatingMutation((payload) => api.post('/admin/materials/videos', payload))

export const useUpdateVideo = () =>
    useInvalidatingMutation(({ id, payload }) => api.put(`/admin/materials/videos/${id}`, payload))

export const useDeleteVideo = () => useInvalidatingMutation((id) => api.del(`/admin/materials/videos/${id}`))

/** Đề bài tập của một khoá (kèm đáp án) — trang soạn bài tập. */
export function useAdminExercise(courseId) {
    return useQuery({
        queryKey: [...ADMIN_MATERIALS_KEY, 'exercise', courseId],
        queryFn: () => api.get(`/admin/materials/courses/${courseId}/exercise`),
        enabled: Boolean(courseId),
        staleTime: 0,
    })
}

export const useSaveExercise = () =>
    useInvalidatingMutation(({ courseId, sections }) => api.put(`/admin/materials/courses/${courseId}/exercise`, { sections }))

// ---------- cấu hình AI chấm ----------

export function useAiGrading() {
    return useQuery({
        queryKey: [...ADMIN_MATERIALS_KEY, 'ai-grading'],
        queryFn: () => api.get('/admin/materials/ai-grading'),
        staleTime: 0,
    })
}

/** Lưu { rubric?, model? } — gửi trường nào lưu trường đó. */
export const useSaveAiGrading = () => useInvalidatingMutation((payload) => api.put('/admin/materials/ai-grading', payload))

/** Chấm thử bằng hướng dẫn + model đang chọn (chưa lưu) — mỗi lần là một lượt gọi AI thật. */
export const useTestAiGrading = () =>
    useMutation({ mutationFn: ({ rubric, model, items }) => api.post('/admin/materials/ai-grading/test', { rubric, model, items }) })

export const useReorderVideos = () =>
    useInvalidatingMutation(({ courseId, ids }) => api.put('/admin/materials/videos/reorder', { courseId, ids }))

export function useMaterialAccess(params) {
    const { courseId, scope, search, page, limit } = params
    return useQuery({
        queryKey: adminAccessKey(params),
        queryFn: () =>
            api.get(
                `/admin/materials/access?${new URLSearchParams({
                    courseId: courseId || '',
                    scope: scope || 'all',
                    search: search || '',
                    page: String(page || 1),
                    limit: String(limit || 20),
                }).toString()}`,
            ),
        placeholderData: (prev) => prev,
    })
}

export const useUpdateMaterialAccess = () =>
    useInvalidatingMutation((payload) => api.patch('/admin/materials/access', payload))
