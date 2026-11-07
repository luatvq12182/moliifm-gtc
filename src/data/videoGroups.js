/**
 * Hai nhóm video trong tab "Video bài giảng" của khoá học liệu (khớp
 * MaterialVideo.group ở API).
 *
 *   supplement  xem đủ hết nhóm này mới mở bài tập của khoá
 *   curriculum  chỉ để xem, không có bài tập, không bắt xem đủ
 */
export const VIDEO_GROUPS = [
  { id: "supplement", slug: "bo-sung", label: "Video bài giảng bổ sung HSK 3.0", short: "Bài giảng bổ sung HSK 3.0" },
  { id: "curriculum", slug: "giao-trinh", label: "Video bài giảng theo giáo trình", short: "Bài giảng theo giáo trình" },
];

/** Nhóm của một video (video cũ chưa có `group` thuộc nhóm bổ sung). */
export const groupOf = (v) => (v?.group === "curriculum" ? "curriculum" : "supplement");

export const groupLabel = (id) => VIDEO_GROUPS.find((g) => g.id === id)?.label || "";

/** Đường dẫn danh sách video của khoá, mở đúng mục (?nhom=…). */
export const videoListPath = (courseSlug, groupId) =>
  `/hoc-lieu/${courseSlug}?tab=video&nhom=${VIDEO_GROUPS.find((g) => g.id === groupId)?.slug || "bo-sung"}`;
