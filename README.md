# GTC 2.0 — Demo luyện nghe nói giao tiếp (HSK1, Bài 1)

React (JavaScript thuần, không TypeScript) + Vite + TailwindCSS.
Màu chủ đạo: cam `#FFC137` (khai báo trong `tailwind.config.js` là `primary`).

## 1. Cài đặt

```bash
npm install
```

## 2. Thêm file video bài học

Đặt file video vào:

```
public/videos/HKS_1_lession_1.mp4
```

Đường dẫn này đã được khai báo sẵn trong `src/data/lesson1.js` (`videoSrc: '/videos/HKS_1_lession_1.mp4'`).
Nếu đổi tên file, chỉ cần sửa lại giá trị `videoSrc` ở file đó.

### Chỉnh mốc thời gian phụ đề (startTime / endTime)

Mỗi câu thoại trong `src/data/lesson1.js` (mảng `dialogue`) có 2 trường `startTime` và
`endTime` (đơn vị giây) — hiện đang là **placeholder tạm** (mỗi câu 6 giây). Bạn cần mở
video thật, ghi lại đúng thời điểm bắt đầu/kết thúc từng câu rồi sửa lại các giá trị này.
Chúng dùng để:

- Tự động highlight đúng câu phụ đề khi video đang phát (kể cả khi tua/xem lại)
- Phát đúng đoạn khi học viên bấm nút "nghe lại câu này" ở phần Luyện nói

## 3. Thêm ảnh thumbnail khóa học

Đặt 2 ảnh vào:

```
public/images/courses/HSK1_thumbnail.png        # ảnh khóa HSK1 (đang mở)
public/images/courses/course_comming_soon.png   # ảnh dùng chung cho khóa "Sắp ra mắt"
```

Nếu chưa có ảnh, giao diện sẽ tự hiện một ô xám thay thế (không vỡ layout) — xem
`src/components/ThumbnailImage.jsx`.

## 4. Cấu hình Azure Speech (cho phần Luyện nói — chấm điểm phát âm)

Copy file `.env.example` thành `.env`, điền key và region Azure Speech của bạn:

```bash
cp .env.example .env
```

```
VITE_AZURE_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
VITE_AZURE_REGION=southeastasia
```

**Lưu ý bảo mật:** đây là code chạy phía trình duyệt (client-side), key sẽ hiển thị được
trong DevTools của người dùng. Việc gọi thẳng key Azure như bản demo này chỉ phù hợp cho
mục đích demo nội bộ. Khi triển khai chính thức, nên dựng một endpoint backend nhỏ để cấp
token tạm thời (Azure hỗ trợ `issueToken`) thay vì nhúng key trực tiếp vào frontend.

## 5. Chạy demo

```bash
npm run dev
```

Mở trình duyệt tại địa chỉ Vite hiển thị (mặc định `http://localhost:5173`).

Lưu ý: phần Luyện nói cần quyền truy cập microphone — trình duyệt sẽ tự hỏi quyền khi bấm
"Ghi âm" lần đầu. Nên chạy ở `localhost` hoặc HTTPS (Web Speech API/microphone yêu cầu
secure context).

## 6. Cấu trúc thư mục

```
src/
  data/
    courses.js        # danh sách khóa học + bài học, có thumbnail
    lesson1.js         # toàn bộ nội dung Bài 1: hội thoại (kèm startTime/endTime), từ vựng, bài tập
  lib/
    azureSpeech.js     # hàm gọi Azure Pronunciation Assessment
  components/
    ThumbnailImage.jsx     # ảnh có fallback khi chưa có file
    AccordionSection.jsx   # khung mở khóa tuần tự (locked/active/done)
    LessonVideoPlayer.jsx  # video dùng chung: phụ đề tự highlight theo thời gian thực,
                            # toggle ẩn/hiện phiên âm + dịch (mặc định ẩn), API playSegment()
    VocabSection.jsx       # phần từ vựng & ngữ pháp mở rộng
    ExerciseSection.jsx    # 4 dạng bài tập (điều phối)
    exercises/
      MultipleChoice.jsx
      TrueFalse.jsx
      SentenceOrder.jsx
      ShortAnswer.jsx
    SpeakingSection.jsx    # transcript đồng bộ video, ghi âm + chấm điểm Azure từng câu
    ResultSection.jsx      # màn hình kết quả cuối bài
  pages/
    CourseSelectPage.jsx   # /  — chọn khóa học (có thumbnail)
    LessonListPage.jsx     # /course/:courseId — chọn bài học
    LessonDetailPage.jsx   # /course/:courseId/lesson/:lessonId — trang học chi tiết
```

## 7. Logic màn hình bài học

**Bước 1 — Xem video (1 cột, toàn màn hình):**
Bắt buộc xem hết video 1 lượt mới bấm được "Tiếp tục". Phụ đề chữ Hán hiện đè lên video,
tự động chuyển theo đúng câu đang phát (dựa vào `startTime`/`endTime`). Phiên âm và bản
dịch mặc định ẩn — có nút bấm để hiện lên khi cần.

**Sau khi xem xong lần đầu — chuyển sang layout 2 cột (desktop):**

- **Cột trái:** video vẫn hiển thị, dính (sticky) khi cuộn, xem lại bất cứ lúc nào.
- **Cột phải:** 3 phần còn lại, vẫn mở khóa tuần tự — Từ vựng & ngữ pháp mở rộng → Bài
  tập luyện tập (4 dạng) → Luyện nói từng câu.

Trên mobile/tablet (dưới breakpoint `lg`), layout tự động xếp dọc thành 1 cột — video ở
trên, nội dung học ở dưới.

**Phần Luyện nói (transcript đồng bộ video):**
Hiển thị toàn bộ các câu thoại dạng danh sách. Câu đang được phát ở cột trái sẽ tự động
highlight màu xanh nhạt trong danh sách này. Mỗi câu có 2 nút: nút phát (▶) để nghe lại
đúng đoạn đó trên video cột trái, và nút mic để ghi âm — gửi lên Azure chấm điểm phát âm,
kết quả (điểm tổng, độ chính xác/trôi chảy/đầy đủ, tô màu từng từ) hiện ngay dưới câu đó.
Hoàn thành khi đã luyện qua hết tất cả các câu.

Sau khi hoàn thành cả 3 phần ở cột phải, màn hình Kết quả hiện ra với điểm trắc nghiệm và
điểm phát âm trung bình.

## 8. Dữ liệu demo hiện có

Hiện chỉ **Bài 1** có đầy đủ dữ liệu (`src/data/lesson1.js`), lấy từ nội dung file
"Nội dung Bài 1.docx" đã cung cấp: hội thoại 17 lượt thoại, 15 từ vựng mở rộng, và 4 dạng
bài tập (chọn đáp án đúng, đúng/sai, sắp xếp câu, trả lời câu hỏi) đúng theo đáp án tham
khảo trong file gốc. Bài 2, Bài 3 và các khóa HSK2/HSK3 đang để trạng thái "Sắp ra mắt" —
thêm dữ liệu tương tự vào `src/data/` khi có nội dung thật.
