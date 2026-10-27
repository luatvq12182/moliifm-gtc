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

// ---------- quản trị ----------

export const adminCoursesKey = () => [...ADMIN_MATERIALS_KEY, 'courses']
export const adminDecksKey = (courseId) => [...ADMIN_MATERIALS_KEY, 'decks', courseId]
export const adminAccessKey = (params) => [...ADMIN_MATERIALS_KEY, 'access', params]

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
