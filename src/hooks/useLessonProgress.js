import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'
import { HISTORY_KEY } from './useLessonHistory.js'

/**
 * LƯU TIẾN ĐỘ BÀI HỌC — làm đến đâu lưu đến đó.
 *
 * Khách đổi yêu cầu (10/2026): học viên bận việc giữa chừng thì lần sau mở bài
 * ra học tiếp đúng chỗ cũ, trên máy nào cũng được. Tiến độ nằm ở máy chủ, xem
 * gtc-api/src/models/LessonAttempt.js.
 */

export const currentAttemptKey = (lessonId) => [...HISTORY_KEY, 'me', 'current', lessonId]

/**
 * Lượt đang dở của bài này (null nếu chưa có).
 *
 * KHÔNG giữ bộ nhớ đệm (gcTime 0): trang học dựng trạng thái ban đầu từ dữ
 * liệu này đúng MỘT lần, nên nó phải là bản mới nhất — học viên có thể vừa
 * học tiếp trên máy khác. Lấy lại khi quay lại tab cũng vô ích vì trạng thái
 * đã dựng rồi, nên tắt luôn.
 */
export function useCurrentAttempt(lessonId) {
    return useQuery({
        queryKey: currentAttemptKey(lessonId),
        queryFn: () => api.get(`/lesson-attempts/current?lessonId=${lessonId}`),
        enabled: Boolean(lessonId),
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
        retry: 1,
    })
}

/** "Học lại từ đầu": xoá lượt đang dở (kèm các lượt đọc và ghi âm của nó). */
export function discardCurrentAttempt(lessonId) {
    return api.del(`/lesson-attempts/current?lessonId=${lessonId}`)
}

/**
 * Cờ gắn vào điều hướng khi đi từ Lịch sử học bằng nút "Học tiếp": trang học
 * thấy cờ này thì vào thẳng chỗ đang dở, không hỏi lại.
 *   <Link to={href} state={RESUME_STATE}>   navigate(href, { state: RESUME_STATE })
 */
export const RESUME_STATE = { resume: true }

const SAVE_DELAY_MS = 800
const RETRY_DELAY_MS = 5000

/**
 * Bộ lưu tiến độ cho một phiên học (một lần mở trang bài học).
 *
 *   schedule(payload) — gọi mỗi khi tiến độ đổi; tự gom lại rồi lưu sau
 *                       ~0,8 giây, bỏ qua nếu nội dung y hệt lần trước.
 *   stop()            — ngừng hẳn (bài vừa hoàn thành, hoặc học lại từ đầu):
 *                       huỷ lần lưu đang chờ để nó không ghi đè lên kết quả.
 *   attemptId()       — id lượt đang dở, để chốt hoàn thành đúng lượt đó.
 *   flushNow()        — gửi ngay phần đang chờ (trang sắp đóng).
 *
 * Mỗi lúc chỉ MỘT request: đang lưu mà có thay đổi mới thì chờ xong rồi lưu
 * tiếp bản mới nhất — hai request song song có thể tới máy chủ sai thứ tự và
 * bản cũ đè lên bản mới.
 *
 * Là một lớp thường chứ không phải chuỗi useCallback: nó là máy trạng thái
 * sống suốt phiên học, không liên quan gì tới vòng render của React.
 */
class ProgressSaver {
    constructor({ attemptId, onSaved }) {
        this.id = attemptId || null
        this.pending = null // payload chờ lưu
        this.lastJson = '' // payload đã lưu gần nhất (để bỏ qua bản trùng)
        this.timer = null
        this.inflight = false
        this.stopped = false
        this.onSaved = onSaved
    }

    attemptId = () => this.id

    schedule = (payload) => {
        if (this.stopped) return
        this.pending = payload
        clearTimeout(this.timer)
        this.timer = setTimeout(this.send, SAVE_DELAY_MS)
    }

    stop = () => {
        this.stopped = true
        this.pending = null
        clearTimeout(this.timer)
    }

    send = async () => {
        if (this.stopped || this.inflight || !this.pending) return
        const json = JSON.stringify(this.pending)
        const payload = { ...this.pending, attemptId: this.id }
        this.pending = null
        if (json === this.lastJson) return

        this.inflight = true
        try {
            const res = await api.put('/lesson-attempts/current', payload)
            if (!res?.ignored && res?.attemptId) this.id = res.attemptId
            this.lastJson = json
            this.onSaved()
        } catch {
            // Mạng chập: giữ lại bản này (trừ khi đã có bản mới hơn) rồi thử lại.
            if (!this.pending) this.pending = JSON.parse(json)
            clearTimeout(this.timer)
            this.timer = setTimeout(this.send, RETRY_DELAY_MS)
            return
        } finally {
            this.inflight = false
        }
        // Có thay đổi mới trong lúc đang lưu -> lưu tiếp ngay.
        if (this.pending && !this.stopped) this.send()
    }

    // Trang sắp đóng / rời trang: gửi NGAY phần đang chờ bằng request giữ sống
    // được sau khi trang biến mất, không đợi hết 0,8 giây.
    flushNow = () => {
        if (this.stopped || !this.pending) return
        const json = JSON.stringify(this.pending)
        if (json === this.lastJson) return
        clearTimeout(this.timer)
        api.putKeepalive('/lesson-attempts/current', { ...this.pending, attemptId: this.id }).catch(() => { })
        this.lastJson = json
        this.pending = null
    }

    dispose = () => clearTimeout(this.timer)
}

export function useProgressSaver(initialAttemptId) {
    const qc = useQueryClient()
    const [saver] = useState(
        () =>
            new ProgressSaver({
                attemptId: initialAttemptId,
                // Màn lịch sử phải thấy bài đang dở mới nhất ở lần mở tới.
                onSaved: () => qc.invalidateQueries({ queryKey: [...HISTORY_KEY, 'me'], refetchType: 'none' }),
            }),
    )

    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') saver.flushNow()
        }
        window.addEventListener('pagehide', saver.flushNow)
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
            window.removeEventListener('pagehide', saver.flushNow)
            document.removeEventListener('visibilitychange', onVisibility)
            // Rời trang bài học trong ứng dụng (bấm quay lại danh sách...).
            saver.flushNow()
            saver.dispose()
        }
    }, [saver])

    return { schedule: saver.schedule, stop: saver.stop, attemptId: saver.attemptId }
}
