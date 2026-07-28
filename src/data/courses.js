export const courses = [
  {
    id: 'hsk1',
    name: 'HSK1',
    description: 'Trình độ sơ cấp - giao tiếp cơ bản hằng ngày',
    available: true,
    thumbnail: '/images/courses/HSK1_thumbnail.png',
    level: 'Sơ cấp',
    totalLessons: 5,
    certificate: 'HSK 1',
  },
  {
    id: 'hsk2',
    name: 'HSK2',
    description: 'Trình độ sơ cấp nâng cao',
    available: false,
    thumbnail: '/images/courses/course_comming_soon.png',
    level: 'Sơ cấp nâng cao',
    totalLessons: 10,
    certificate: 'HSK 2',
  },
  {
    id: 'hsk3',
    name: 'HSK3',
    description: 'Trình độ trung cấp',
    available: false,
    thumbnail: '/images/courses/course_comming_soon.png',
    level: 'Trung cấp',
    totalLessons: 15,
    certificate: 'HSK 3',
  },
  {
    id: 'hsk4',
    name: 'HSK4',
    description: 'Trình độ trung cấp',
    available: false,
    thumbnail: '/images/courses/course_comming_soon.png',
    level: 'Trung cấp',
    totalLessons: 15,
    certificate: 'HSK 4',
  },
]

export const lessons = {
  hsk1: [
    {
      id: 'bai-1',
      title: 'Bài 1',
      description: 'Tổng hợp nội dung từ Bài 1 đến Bài 5 GTC HSK1',
      available: true,
    },
    {
      id: 'bai-2',
      title: 'Bài 2',
      description: 'Tổng hợp nội dung từ Bài 6 đến Bài 8 GTC HSK1',
      available: true,
    },
    {
      id: 'bai-3',
      title: 'Bài 3',
      description: 'Sắp ra mắt',
      available: false,
    },
    {
      id: 'bai-4',
      title: 'Bài 4',
      description: 'Sắp ra mắt',
      available: false,
    },
    {
      id: 'bai-5',
      title: 'Bài 5',
      description: 'Sắp ra mắt',
      available: false,
    },
  ],
}
