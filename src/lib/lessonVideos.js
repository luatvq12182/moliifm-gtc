// Gộp toàn bộ hội thoại từ nhiều video trong 1 bài học thành 1 danh sách
// phẳng — dùng cho phần Luyện nói (cần luyện hết tất cả các câu, bất kể câu
// đó thuộc video nào) và Bản dịch. Mỗi dòng vẫn giữ videoIndex/localIndex để
// biết chính xác nó thuộc video nào, vị trí thứ mấy trong video đó.
export function flattenLessonDialogue(videos) {
    const lines = []
        ; (videos || []).forEach((video, videoIndex) => {
            ; (video.dialogue || []).forEach((line, localIndex) => {
                lines.push({ ...line, videoIndex, localIndex, videoTitle: video.title })
            })
        })
    return lines
}

// Các dạng bài tập ĐÃ BIẾT. Khoá HSK 3/4 sẽ có dạng mới — thêm vào đây là mọi
// phép đếm/kiểm tra trong file này tự chạy theo.
export const EXERCISE_TYPES = ['multipleChoice', 'trueFalse', 'sentenceOrder', 'shortAnswer']

export function countExercises(exercises) {
    return EXERCISE_TYPES.reduce(
        (sum, key) => sum + (Array.isArray(exercises?.[key]) ? exercises[key].length : 0),
        0
    )
}

/**
 * Lấy nội dung DÀNH RIÊNG cho một video.
 *
 * Khách hàng soạn một file docx cho mỗi video, và muốn học viên xem video nào
 * thì chỉ thấy lời thoại, từ vựng, bài tập của video ấy.
 *
 * CƠ CHẾ LÙI: video chưa có nội dung riêng thì lấy tạm ở cấp bài học — đó là
 * chỗ ở cũ, hồi nội dung còn dùng chung. Nhờ vậy bài đã xuất bản không vỡ khi
 * chưa chạy `npm run migrate:video-content` bên API.
 *
 * Lùi theo TỪNG KHỐI chứ không theo từng dạng bài: nếu video đã có bài tập
 * riêng thì dùng trọn bộ của nó, không trộn thêm dạng nào từ cấp bài học —
 * trộn vào thì học viên gặp câu hỏi của video khác mà không hiểu vì sao.
 */
export function resolveVideoContent(lesson, videoIndex) {
    const video = lesson?.videos?.[videoIndex] || {}

    const ownVocabulary = Array.isArray(video.vocabulary) ? video.vocabulary : []
    const lessonVocabulary = Array.isArray(lesson?.vocabulary) ? lesson.vocabulary : []

    const ownExercises = video.exercises || {}
    const lessonExercises = lesson?.exercises || {}

    return {
        dialogue: Array.isArray(video.dialogue) ? video.dialogue : [],
        vocabulary: ownVocabulary.length > 0 ? ownVocabulary : lessonVocabulary,
        exercises: countExercises(ownExercises) > 0 ? ownExercises : lessonExercises,
    }
}
