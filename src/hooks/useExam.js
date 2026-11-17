import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

/**
 * "Luyện thi HSK 3.0 cùng Molii FM" — truy vấn cho học viên và quản trị.
 *
 * Khoá truy vấn khai một chỗ (cùng lý do đã ghi trong useStudents.js).
 */
export const EXAM_KEY = ['exam']
export const ADMIN_EXAM_KEY = ['admin-exam']

const noRetryOnDenied = (count, err) => err?.status !== 403 && err?.status !== 404 && count < 2

// ---------- học viên ----------

export function useMyExamLevels() {
    return useQuery({
        queryKey: [...EXAM_KEY, 'levels'],
        queryFn: () => api.get('/exam/levels'),
    })
}

export function useMyExamLevel(slug) {
    return useQuery({
        queryKey: [...EXAM_KEY, 'level', slug],
        queryFn: () => api.get(`/exam/levels/${slug}`),
        enabled: Boolean(slug),
        retry: noRetryOnDenied,
    })
}

export function useMyExamVideo(id) {
    return useQuery({
        queryKey: [...EXAM_KEY, 'video', id],
        queryFn: () => api.get(`/exam/videos/${id}`),
        enabled: Boolean(id),
        // Mở lại video phải lấy chỗ đang xem MỚI NHẤT, không dùng bản cũ trong bộ nhớ.
        staleTime: 0,
        gcTime: 0,
        retry: noRetryOnDenied,
    })
}

export const myExamVideoThumbPath = (videoId) => `/exam/videos/${videoId}/thumb`
export const myExamVideoProgressPath = (videoId) => `/exam/videos/${videoId}/progress`

/** Giới thiệu một đề + lượt đang làm dở (nếu có). */
export function useMyExamTest(id) {
    return useQuery({
        queryKey: [...EXAM_KEY, 'test', id],
        queryFn: () => api.get(`/exam/tests/${id}`),
        enabled: Boolean(id),
        staleTime: 0,
        retry: noRetryOnDenied,
    })
}

/** Vào thi { name, phone, classCode } -> { _id, resumed }. */
export function useStartExamAttempt(testId) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload) => api.post(`/exam/tests/${testId}/attempts`, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: EXAM_KEY }),
    })
}

/**
 * Trạng thái một bài làm. Kèm `skew` = giờ máy chủ - giờ máy học viên (ms),
 * để đồng hồ đếm ngược theo giờ máy chủ dù đồng hồ máy học viên sai. Tự hỏi
 * lại mỗi 20 giây (làm trên hai máy, mạng chập chờn…).
 */
export function useMyExamAttempt(id) {
    return useQuery({
        queryKey: [...EXAM_KEY, 'attempt', id],
        queryFn: async () => {
            const t0 = Date.now()
            const data = await api.get(`/exam/attempts/${id}`)
            return { ...data, skew: new Date(data.serverNow).getTime() - (t0 + Date.now()) / 2 }
        },
        enabled: Boolean(id),
        staleTime: 0,
        gcTime: 0,
        // Đang thi: hỏi lại 20 giây/lần. Đã nộp mà đang chấm (chưa có kết quả / AI
        // đang chấm phần đặt câu): 3 giây/lần cho tới khi xong.
        refetchInterval: (query) => {
            const d = query.state.data
            if (!d) return false
            if (d.status === 'in_progress') return 20000
            return !d.result || d.result.ai?.status === 'pending' ? 3000 : false
        },
        refetchOnWindowFocus: true,
        retry: noRetryOnDenied,
    })
}

export const myAttemptPagePath = (attemptId, n) => `/exam/attempts/${attemptId}/pages/${n}`
export const saveMyAttemptAnswers = (attemptId, answers, { keepalive = false } = {}) =>
    keepalive ? api.putKeepalive(`/exam/attempts/${attemptId}/answers`, { answers }) : api.put(`/exam/attempts/${attemptId}/answers`, { answers })
export const finishMyAttemptSection = (attemptId, section) => api.post(`/exam/attempts/${attemptId}/finish`, { section })

/** Cho AI chấm lại phần đặt câu (lần trước lỗi / hết lượt trong ngày). */
export function useRegradeMyAttempt(attemptId) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => api.post(`/exam/attempts/${attemptId}/regrade`, {}),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...EXAM_KEY, 'attempt', attemptId] }),
    })
}

// ---------- quản trị ----------

export const adminExamVideoThumbPath = (videoId) => `/admin/exam/videos/${videoId}/thumb`

function useInvalidatingMutation(mutationFn) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn,
        onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_EXAM_KEY }),
    })
}

export function useAdminExamLevels() {
    return useQuery({
        queryKey: [...ADMIN_EXAM_KEY, 'levels'],
        queryFn: () => api.get('/admin/exam/levels'),
    })
}

export const useSaveExamLevel = () =>
    useInvalidatingMutation(({ id, payload }) => (id ? api.put(`/admin/exam/levels/${id}`, payload) : api.post('/admin/exam/levels', payload)))

export const useDeleteExamLevel = () =>
    useInvalidatingMutation(({ id, force }) => api.del(`/admin/exam/levels/${id}${force ? '?force=1' : ''}`))

export function useAdminExamVideos(levelId) {
    return useQuery({
        queryKey: [...ADMIN_EXAM_KEY, 'videos', levelId],
        queryFn: () => api.get(`/admin/exam/videos?levelId=${levelId}`),
        enabled: Boolean(levelId),
    })
}

/** Thêm video từ link YouTube — máy chủ đọc tên + thời lượng ngay. */
export const useAddExamVideo = () => useInvalidatingMutation((payload) => api.post('/admin/exam/videos', payload))

/** Nhập cả danh sách phát YouTube vào một cấp thi. */
export const useImportExamPlaylist = () => useInvalidatingMutation((payload) => api.post('/admin/exam/videos/playlist', payload))

export const useUpdateExamVideo = () =>
    useInvalidatingMutation(({ id, payload }) => api.put(`/admin/exam/videos/${id}`, payload))

export const useDeleteExamVideo = () => useInvalidatingMutation((id) => api.del(`/admin/exam/videos/${id}`))

export const useReorderExamVideos = () =>
    useInvalidatingMutation(({ levelId, ids }) => api.put('/admin/exam/videos/reorder', { levelId, ids }))

export function useExamAccess(params) {
    const { levelId, scope, search, page, limit } = params
    return useQuery({
        queryKey: [...ADMIN_EXAM_KEY, 'access', params],
        queryFn: () =>
            api.get(
                `/admin/exam/access?${new URLSearchParams({
                    levelId: levelId || '',
                    scope: scope || 'all',
                    search: search || '',
                    page: String(page || 1),
                    limit: String(limit || 20),
                }).toString()}`,
            ),
        placeholderData: (prev) => prev,
    })
}

export const useUpdateExamAccess = () => useInvalidatingMutation((payload) => api.patch('/admin/exam/access', payload))

// ---------- đề luyện thi (quản trị) ----------

export const adminExamPagePath = (testId, n, { thumb = false } = {}) => `/admin/exam/tests/${testId}/pages/${n}${thumb ? '?thumb=1' : ''}`
export const adminExamAudioPath = (testId) => `/admin/exam/tests/${testId}/audio`

export function useExamTemplates() {
    return useQuery({ queryKey: [...ADMIN_EXAM_KEY, 'templates'], queryFn: () => api.get('/admin/exam/templates'), staleTime: Infinity })
}

export function useAdminExamTests(levelId) {
    return useQuery({
        queryKey: [...ADMIN_EXAM_KEY, 'tests', levelId],
        queryFn: () => api.get(`/admin/exam/tests?levelId=${levelId}`),
        enabled: Boolean(levelId),
    })
}

/** Một đề (kèm đáp án). Đang chuyển đổi PDF thì tự hỏi lại mỗi 2 giây tới khi xong. */
export function useAdminExamTest(id) {
    return useQuery({
        queryKey: [...ADMIN_EXAM_KEY, 'test', id],
        queryFn: () => api.get(`/admin/exam/tests/${id}`),
        enabled: Boolean(id),
        staleTime: 0,
        refetchInterval: (query) => (query.state.data?.pdf?.conversion === 'processing' ? 2000 : false),
    })
}

export const useCreateExamTest = () => useInvalidatingMutation((payload) => api.post('/admin/exam/tests', payload))

export const useUpdateExamTest = () => useInvalidatingMutation(({ id, payload }) => api.put(`/admin/exam/tests/${id}`, payload))

export const useDeleteExamTest = () => useInvalidatingMutation((id) => api.del(`/admin/exam/tests/${id}`))

export const useReorderExamTests = () =>
    useInvalidatingMutation(({ levelId, ids }) => api.put('/admin/exam/tests/reorder', { levelId, ids }))

/** Tải file đề PDF / file nghe lên một đề: { id, kind: 'pdf'|'audio', file, fields, onProgress }. */
export const useUploadExamFile = () =>
    useInvalidatingMutation(({ id, kind, file, fields = {}, onProgress }) => {
        const form = new FormData()
        for (const [k, v] of Object.entries(fields)) form.append(k, v)
        form.append('file', file)
        return api.uploadForm(`/admin/exam/tests/${id}/${kind}`, form, { onProgress })
    })

export const useReconvertExamPdf = () =>
    useInvalidatingMutation(({ id, splitSpreads }) => api.post(`/admin/exam/tests/${id}/pdf/convert`, { splitSpreads }))

export const useSetExamHiddenPages = () =>
    useInvalidatingMutation(({ id, hidden }) => api.put(`/admin/exam/tests/${id}/pages`, { hidden }))

export const useDeleteExamAudio = () => useInvalidatingMutation((id) => api.del(`/admin/exam/tests/${id}/audio`))

// ---------- kết quả luyện thi (quản trị) ----------

export const examAttemptQuery = ({ levelId, testId, status, search, page, limit }) =>
    new URLSearchParams({
        levelId: levelId || '',
        testId: testId || '',
        status: status || '',
        search: search || '',
        page: String(page || 1),
        limit: String(limit || 20),
    }).toString()

export function useExamAttempts(params) {
    const { levelId, testId, status, search, page, limit } = params
    return useQuery({
        queryKey: [...ADMIN_EXAM_KEY, 'attempts', params],
        queryFn: () => api.get(`/admin/exam/attempts?${examAttemptQuery({ levelId, testId, status, search, page, limit })}`),
        placeholderData: (prev) => prev,
    })
}

/** Một bài làm (kèm từng câu). AI đang chấm thì hỏi lại 3 giây/lần. */
export function useExamAttempt(id) {
    return useQuery({
        queryKey: [...ADMIN_EXAM_KEY, 'attempt', id],
        queryFn: () => api.get(`/admin/exam/attempts/${id}`),
        enabled: Boolean(id),
        staleTime: 0,
        refetchInterval: (query) => (query.state.data?.result?.ai?.status === 'pending' ? 3000 : false),
    })
}

export const useRegradeExamAttempt = () => useInvalidatingMutation((id) => api.post(`/admin/exam/attempts/${id}/regrade`, {}))

export const useDeleteExamAttempt = () => useInvalidatingMutation((id) => api.del(`/admin/exam/attempts/${id}`))

/** Sửa đáp án xong -> chấm lại phần máy chấm của mọi bài đã nộp của đề. */
export const useRegradeExamTest = () => useInvalidatingMutation((id) => api.post(`/admin/exam/tests/${id}/regrade`, {}))
