import {
  IconBook,
  IconClipboard,
  IconFile,
  IconFolder,
  IconGraduation,
  IconHome,
  IconKey,
  IconLayers,
  IconPlay,
  IconPresentation,
  IconSignal,
  IconSlides,
  IconSparkles,
  IconTrophy,
  IconUsers,
  IconVideo,
} from "./icons.jsx";

/**
 * Menu trang quản trị — dùng chung cho thanh bên, đường dẫn trang (breadcrumb)
 * và bảng lệnh ⌘K.
 */
export const NAV_SECTIONS = [
  {
    label: "Chung",
    items: [
      { type: "link", to: "/admin", end: true, label: "Tổng quan", icon: IconHome },
      { type: "link", to: "/admin/students", label: "Tài khoản học viên", icon: IconUsers },
    ],
  },
  {
    label: "Nội dung",
    items: [
      {
        type: "group",
        label: "Luyện nghe nói qua video AI",
        short: "Video AI",
        icon: IconVideo,
        children: [
          { to: "/admin/gtc/curricula", label: "Giáo trình", icon: IconBook },
          { to: "/admin/gtc/courses", label: "Khóa học", icon: IconLayers },
          { to: "/admin/gtc/lessons", label: "Bài học", icon: IconFile },
        ],
      },
      {
        type: "group",
        label: "Học liệu khoá học",
        short: "Học liệu",
        icon: IconPresentation,
        children: [
          { to: "/admin/materials/courses", label: "Khoá học liệu", icon: IconFolder },
          { to: "/admin/materials/decks", label: "Bộ slide", icon: IconSlides },
          { to: "/admin/materials/videos", label: "Video bài giảng", icon: IconPlay },
          { to: "/admin/materials/access", label: "Cấp quyền", icon: IconKey },
          { to: "/admin/materials/ai-grading", label: "Cấu hình AI chấm", icon: IconSparkles },
        ],
      },
      {
        type: "group",
        label: "Luyện thi HSK 3.0",
        short: "Luyện thi",
        icon: IconGraduation,
        children: [
          { to: "/admin/exam/levels", label: "Cấp thi", icon: IconSignal },
          { to: "/admin/exam/videos", label: "Video kỹ năng thi", icon: IconPlay },
          { to: "/admin/exam/tests", label: "Đề luyện thi", icon: IconClipboard },
          { to: "/admin/exam/results", label: "Kết quả luyện thi", icon: IconTrophy },
          { to: "/admin/exam/access", label: "Cấp quyền", icon: IconKey },
        ],
      },
    ],
  },
];

/** Mọi trang (phẳng) kèm đường dẫn nhóm — cho bảng lệnh và breadcrumb. */
export const ALL_PAGES = NAV_SECTIONS.flatMap((s) =>
  s.items.flatMap((item) =>
    item.type === "link"
      ? [{ to: item.to, end: item.end, label: item.label, trail: [item.label], icon: item.icon }]
      : item.children.map((c) => ({ to: c.to, label: c.label, trail: [item.label, c.label], icon: c.icon, group: item.label })),
  ),
);

/** Trang nào đang mở (khớp đường dẫn dài nhất). */
export function currentPage(pathname) {
  let best = null;
  for (const p of ALL_PAGES) {
    const hit = p.end ? pathname === p.to || pathname === p.to + "/" : pathname.startsWith(p.to);
    if (hit && (!best || p.to.length > best.to.length)) best = p;
  }
  return best;
}
