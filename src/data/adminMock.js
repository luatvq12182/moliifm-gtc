// Dữ liệu mock tĩnh cho demo giao diện Admin — chưa gọi API thật.

export const mockStudents = [
  { id: 1, name: 'Nguyễn Thu Hà', email: 'thuha@gmail.com', phone: '0901 234 567', course: 'HSK1', progress: 'Bài 1/5', status: 'active', joinedAt: '12/06/2026' },
  { id: 2, name: 'Trần Văn Long', email: 'long.tran@gmail.com', phone: '0912 345 678', course: 'HSK1', progress: 'Bài 3/5', status: 'active', joinedAt: '15/06/2026' },
  { id: 3, name: 'Lê Minh Anh', email: 'minhanh.le@gmail.com', phone: '0987 654 321', course: 'HSK1', progress: 'Bài 5/5', status: 'active', joinedAt: '02/06/2026' },
  { id: 4, name: 'Phạm Quốc Bảo', email: 'quocbao@gmail.com', phone: '0977 111 222', course: 'HSK1', progress: 'Bài 1/5', status: 'locked', joinedAt: '20/06/2026' },
  { id: 5, name: 'Đỗ Ngọc Linh', email: 'ngoclinh.do@gmail.com', phone: '0966 888 999', course: 'HSK1', progress: 'Bài 2/5', status: 'active', joinedAt: '18/06/2026' },
  { id: 6, name: 'Vũ Thị Mai', email: 'vuthimai@gmail.com', phone: '0933 222 111', course: 'HSK1', progress: 'Chưa bắt đầu', status: 'active', joinedAt: '19/07/2026' },
]

export const mockGtcLessons = [
  { id: 'bai-1', order: 1, title: 'Bài 1', description: 'Tổng hợp nội dung từ Bài 1 đến Bài 5 GTC HSK1', status: 'published', questionCount: 8, updatedAt: '10/07/2026' },
  { id: 'bai-2', order: 2, title: 'Bài 2', description: 'Tổng hợp kiến thức Bài 6 đến Bài 8', status: 'published', questionCount: 8, updatedAt: '18/07/2026' },
  { id: 'bai-3', order: 3, title: 'Bài 3', description: 'Chưa có nội dung', status: 'draft', questionCount: 0, updatedAt: '—' },
]