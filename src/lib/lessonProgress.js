import { interpretRejection } from './iflytekSpeech.js'
import { countExercises } from './lessonVideos.js'

/**
 * Tiện ích cho việc lưu / khôi phục tiến độ bài học (làm đến đâu lưu đến đó).
 * Phần gửi lên máy chủ nằm ở hooks/useLessonProgress.js.
 */

export const STEPS_PER_VIDEO = 4

/**
 * Kết quả một câu luyện nói, dựng lại từ dữ liệu máy chủ đã lưu — cùng dạng
 * với kết quả màn luyện nói tạo ra lúc chấm, để SpeakingSection và màn luyện
 * nói hiện lại y như lúc học viên rời đi.
 *
 * Thiếu so với kết quả gốc: bản ghi âm trong bộ nhớ (nghe lại qua máy chủ,
 * cờ `restored`) và vài gợi ý phụ (từ ghép, từ cần luyện) không được lưu.
 */
export function restoredSpeakingResult(r) {
    const base = {
        restored: true,
        attemptId: r.attemptId,
        hasAudio: Boolean(r.hasAudio),
        audioUrl: '',
        audioBlob: null,
        spokenText: r.spokenText || '',
        words: r.words || [],
        chars: r.chars || [],
        compounds: [],
        focusWord: null,
        feedback: r.feedback || '',
    }
    if (r.rejected) {
        const { reason, message } = interpretRejection(r.exceptInfo)
        return {
            ...base,
            rejected: true,
            rejectReason: reason,
            rejectMessage: message,
            pronScore: null,
            accuracy: null,
            prosody: null,
            fluency: null,
            completeness: null,
            words: [],
            chars: [],
        }
    }
    return {
        ...base,
        rejected: false,
        pronScore: r.pronScore,
        accuracy: r.accuracy,
        prosody: r.prosody,
        fluency: r.fluency,
        completeness: r.completeness,
        spokenMatch: r.spokenMatch || null,
        spokenMismatch: Boolean(r.spokenMismatch),
        cappedFrom: r.cappedFrom ?? null,
    }
}

/** Kết quả luyện nói đã lưu, chia theo video: [{ [lineIndex]: result }]. */
export function savedSpeakingByVideo(speaking, videoCount) {
    const out = Array.from({ length: videoCount }, () => ({}))
    for (const s of speaking || []) {
        if (s.videoIndex >= 0 && s.videoIndex < videoCount && s.lineIndex >= 0) {
            out[s.videoIndex][s.lineIndex] = restoredSpeakingResult(s.result)
        }
    }
    return out
}

/**
 * Phần trăm tiến độ cả bài, theo số bước đã xong của mọi video, CÓ TÍNH phần
 * dở của bước đang làm (bài tập: số câu đã làm; luyện nói: số câu đã đọc) —
 * để làm được vài câu thì con số cũng nhích lên, không đứng im ở 0%.
 */
export function progressPercent({ videoCount, completedCount, exerciseAnswered, exerciseTotal, speakingAttempted, speakingTotal }) {
    if (!videoCount) return 0
    let steps = 0
    for (let i = 0; i < videoCount; i++) {
        const done = Math.min(STEPS_PER_VIDEO, completedCount(i))
        steps += done
        if (done === 0) {
            const total = exerciseTotal(i)
            if (total > 0) steps += Math.min(1, exerciseAnswered(i) / total)
        } else if (done === 2) {
            const total = speakingTotal(i)
            if (total > 0) steps += Math.min(1, speakingAttempted(i) / total)
        }
    }
    return Math.round((steps / (videoCount * STEPS_PER_VIDEO)) * 100)
}

export { countExercises }
