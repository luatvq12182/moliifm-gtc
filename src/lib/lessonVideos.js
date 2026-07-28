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