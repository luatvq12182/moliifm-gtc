import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

// Cờ tính năng do máy chủ quyết định. Frontend KHÔNG tự quyết — nếu backend tắt
// PRACTICE_HISTORY_ENABLED thì các endpoint lịch sử trả 404, nên giao diện phải
// hỏi máy chủ rồi mới biết có hiện mục "Lịch sử luyện nói" hay không.
export function useAppConfigQuery() {
    return useQuery({
        queryKey: ['app-config'],
        queryFn: () => api.get('/config'),
        staleTime: 5 * 60 * 1000, // cờ hiếm khi đổi, không cần hỏi lại liên tục
    })
}
