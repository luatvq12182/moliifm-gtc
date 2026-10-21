import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader.jsx";
import HistoryHeader, { CourseTile } from "../components/history/HistoryHeader.jsx";
import {
  BookIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  ExerciseIcon,
  HeadphoneIcon,
} from "../components/history/icons.jsx";
import { useMyHistory } from "../hooks/useLessonHistory.js";
import { RESUME_STATE } from "../hooks/useLessonProgress.js";

export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Bài đang học dở (chưa đi hết mọi bước của mọi video). */
export const isInProgress = (attempt) => attempt?.status === "in_progress";

/** Mốc thời gian để hiện: lúc hoàn thành, hoặc lần học gần nhất nếu còn dở. */
export const attemptTime = (attempt) =>
  isInProgress(attempt) ? attempt.activityAt : attempt.completedAt || attempt.activityAt;

/** Đường dẫn về trang học của bài (null nếu bản ghi thiếu slug). */
export function lessonHrefOf(attempt) {
  if (!attempt?.curriculumSlug || !attempt?.courseSlug || !attempt?.lessonSlug) return null;
  return `/nghe-noi-video-ai/curriculum/${attempt.curriculumSlug}/course/${attempt.courseSlug}/lesson/${attempt.lessonSlug}`;
}

/** Nhãn "Đang học · 40%". */
export function InProgressBadge({ attempt }) {
  return (
    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      Đang học · {attempt.progressPercent ?? 0}%
    </span>
  );
}

/**
 * Nhãn khóa học bên cạnh tên bài (màn đối chiếu của giáo viên dùng).
 *
 * Bản ghi cũ chưa có tên khóa thì lùi về slug — xấu hơn nhưng vẫn phân biệt
 * được, hơn là không hiện gì.
 */
export function CourseBadge({ attempt }) {
  const label = attempt.courseName || attempt.courseSlug;
  if (!label) return null;
  return (
    <span
      className="shrink-0 text-[11px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md"
      title={attempt.curriculumName || undefined}
    >
      {label}
    </span>
  );
}

const scoreTone = (value) =>
  value === null || value === undefined
    ? "bg-gray-50 text-gray-300"
    : value >= 80
      ? "bg-green-50 text-green-600"
      : value >= 60
        ? "bg-amber-50 text-amber-600"
        : "bg-red-50 text-red-500";

/** Ô điểm nhỏ trên mỗi dòng danh sách. */
export function MiniScore({ icon, label, value }) {
  const has = value !== null && value !== undefined;
  return (
    <div className={"flex-1 sm:flex-none sm:w-24 rounded-xl px-3 py-2 " + scoreTone(value)}>
      <p className="flex items-center gap-1 text-[11px] opacity-80">
        {icon}
        {label}
      </p>
      <p className="text-xl font-bold leading-tight mt-0.5">{has ? value : "—"}</p>
    </div>
  );
}

const RANGE_OPTIONS = [
  { value: "", label: "Mọi thời gian" },
  { value: "7d", label: "7 ngày qua" },
  { value: "30d", label: "30 ngày qua" },
  { value: "90d", label: "3 tháng qua" },
  { value: "365d", label: "12 tháng qua" },
];

const EMPTY_FILTERS = { courseSlug: "", lessonId: "", range: "" };

export default function LessonHistoryPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const { data, isLoading, isError, error, isFetching } = useMyHistory(page, filters);

  const items = data?.data || [];
  const pagination = data?.pagination;
  const courses = useMemo(() => data?.courses || [], [data]);
  const lessons = useMemo(() => data?.lessons || [], [data]);
  const stats = data?.stats;

  const filtering = Boolean(filters.courseSlug || filters.lessonId || filters.range);

  // Bài học chỉ liệt kê những bài thuộc khóa đang chọn. Chưa chọn khóa thì
  // liệt kê hết, kèm tên khóa — vì "Bài 1" thì khóa nào cũng có.
  const lessonOptions = useMemo(
    () => (filters.courseSlug ? lessons.filter((l) => l.courseSlug === filters.courseSlug) : lessons),
    [lessons, filters.courseSlug],
  );

  const update = (patch) => {
    setPage(1);
    setFilters((f) => {
      const next = { ...f, ...patch };
      // Đổi khóa mà bài đang chọn không thuộc khóa mới -> bỏ chọn bài. Nếu
      // không, hai bộ lọc mâu thuẫn nhau và danh sách trống không rõ vì sao.
      if (patch.courseSlug !== undefined && next.lessonId) {
        const l = lessons.find((x) => x.id === next.lessonId);
        if (l && patch.courseSlug && l.courseSlug !== patch.courseSlug) next.lessonId = "";
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader backTo="/" backLabel="Trang chủ" title="Lịch sử học" />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <HistoryHeader
          icon={<ClockIcon size={22} />}
          title="Lịch sử học"
          footer={stats && <StatsRow stats={stats} />}
        />

        {stats && stats.totalCompletions > 0 && (
          <FilterBar
            filters={filters}
            courses={courses}
            lessons={lessonOptions}
            showCourseInLesson={!filters.courseSlug && courses.length > 1}
            onChange={update}
            onReset={() => {
              setPage(1);
              setFilters(EMPTY_FILTERS);
            }}
            filtering={filtering}
          />
        )}

        {isLoading && <p className="text-sm text-gray-400">Đang tải lịch sử...</p>}
        {isError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
            {error.message}
          </p>
        )}

        {!isLoading && !isError && pagination && (
          <>
            {filtering && (
              <p className={"text-xs text-gray-500 px-1 " + (isFetching ? "opacity-60" : "")}>
                {pagination.total} kết quả phù hợp
              </p>
            )}

            {items.length === 0 ? (
              <EmptyState filtering={filtering} onReset={() => setFilters(EMPTY_FILTERS)} />
            ) : (
              <div className={"space-y-3 transition-opacity " + (isFetching ? "opacity-60" : "")}>
                {items.map((a) => (
                  <AttemptRow key={a._id} attempt={a} />
                ))}
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm rounded-xl border border-gray-200 bg-white disabled:opacity-40"
                >
                  Trước
                </button>
                <span className="text-xs text-gray-500">
                  Trang {pagination.page}/{pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-4 py-2 text-sm rounded-xl border border-gray-200 bg-white disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Số liệu tổng quan — tính trên TOÀN BỘ lịch sử, không đổi theo bộ lọc. Nó
 * trả lời "mình đã học được bao nhiêu", còn bộ lọc trả lời "tìm lại lượt nào".
 */
function StatsRow({ stats }) {
  const items = [
    { label: "Lượt hoàn thành", value: stats.totalCompletions, plain: true },
    { label: "Bài đã học", value: stats.distinctLessons, plain: true },
    { label: "Bài tập trung bình", value: stats.exerciseAvg },
    { label: "Phát âm trung bình", value: stats.speakingAvg },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
      {items.map((it) => (
        <div key={it.label} className="px-5 py-3.5">
          <p className="text-[11px] text-gray-400">{it.label}</p>
          <p
            className={
              "text-2xl font-bold leading-tight mt-0.5 " +
              (it.plain
                ? "text-gray-900"
                : it.value === null || it.value === undefined
                  ? "text-gray-300"
                  : scoreTone(it.value).split(" ")[1])
            }
          >
            {it.value ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

function FilterBar({ filters, courses, lessons, showCourseInLesson, onChange, onReset, filtering }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-col sm:flex-row gap-2 sm:items-center">
      <FilterSelect
        icon={<BookIcon size={15} />}
        value={filters.courseSlug}
        onChange={(v) => onChange({ courseSlug: v })}
      >
        <option value="">Tất cả khóa học</option>
        {courses.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        icon={<ExerciseIcon size={15} />}
        value={filters.lessonId}
        onChange={(v) => onChange({ lessonId: v })}
      >
        <option value="">Tất cả bài học</option>
        {lessons.map((l) => (
          <option key={l.id} value={l.id}>
            {showCourseInLesson ? `${l.courseName} · ` : ""}
            {l.title} ({l.count} lần)
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        icon={<CalendarIcon size={14} />}
        value={filters.range}
        onChange={(v) => onChange({ range: v })}
      >
        {RANGE_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </FilterSelect>

      {filtering && (
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-sm text-gray-500 hover:text-primary-dark px-3 py-2"
        >
          Xoá lọc
        </button>
      )}
    </div>
  );
}

function FilterSelect({ icon, value, onChange, children }) {
  return (
    <div className="relative flex-1 min-w-0">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          "appearance-none w-full rounded-xl pl-9 pr-8 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-primary " +
          (value ? "border-primary-dark/50 bg-amber-50/60 text-gray-900" : "border-gray-200 bg-white text-gray-600")
        }
      >
        {children}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90">
        <ChevronRightIcon size={14} />
      </span>
    </div>
  );
}

function EmptyState({ filtering, onReset }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
      {filtering ? (
        <>
          <p className="text-sm text-gray-600">Không có lượt học nào khớp bộ lọc.</p>
          <button onClick={onReset} className="mt-3 text-sm text-primary-dark underline">
            Xoá lọc
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">Bạn chưa hoàn thành bài học nào.</p>
          <p className="text-xs text-gray-400 mt-1">
            Lịch sử chỉ được lưu khi bạn đi hết cả bài — làm dở rồi thoát thì không tính.
          </p>
          <Link
            to="/nghe-noi-video-ai"
            className="inline-block mt-4 px-5 py-2.5 rounded-xl font-medium bg-primary hover:bg-primary-dark text-gray-900"
          >
            Bắt đầu học
          </Link>
        </>
      )}
    </div>
  );
}

function AttemptRow({ attempt }) {
  const navigate = useNavigate();
  const many = attempt.lessonAttemptCount > 1;
  const inProgress = isInProgress(attempt);
  const href = lessonHrefOf(attempt);
  return (
    <Link
      to={`/lich-su-hoc/${attempt._id}`}
      className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-white rounded-2xl border border-gray-200 p-4 hover:border-primary hover:shadow-[0_8px_24px_-12px_rgba(230,168,0,0.45)] transition"
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <CourseTile label={attempt.courseName || attempt.courseSlug} />

        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-base font-heading font-semibold truncate">
              {attempt.lessonTitle || "Bài học"}
            </p>
            {/* Lần thứ mấy của CHÍNH BÀI NÀY — đếm trên toàn bộ lịch sử, nên
                lọc theo thời gian không làm "lần 3" biến thành "lần 1". */}
            {many && attempt.attemptNo && (
              <span className="shrink-0 text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                Lần {attempt.attemptNo}/{attempt.lessonAttemptCount}
              </span>
            )}
            {inProgress && <InProgressBadge attempt={attempt} />}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 min-w-0">
            <CalendarIcon />
            <span className="shrink-0">
              {inProgress ? "Học gần nhất " : ""}
              {formatDate(attemptTime(attempt))}
            </span>
            {attempt.curriculumName && (
              <span className="truncate hidden sm:inline">· {attempt.curriculumName}</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Bài đang dở: điểm của nửa bài dễ gây hiểu lầm, thay bằng tiến độ và
            nút học tiếp. Bấm vào dòng vẫn xem được chi tiết các câu đã làm. */}
        {inProgress ? (
          <>
            <div className="flex-1 sm:flex-none sm:w-36">
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${attempt.progressPercent ?? 0}%` }}
                />
              </div>
            </div>
            {href && (
              <button
                type="button"
                onClick={(e) => {
                  // Cả dòng là một liên kết tới trang chi tiết — chặn lại để
                  // nút này đưa thẳng về trang học.
                  e.preventDefault();
                  e.stopPropagation();
                  // Từ lịch sử bấm "Học tiếp" -> vào thẳng chỗ đang dở, không hỏi.
                  navigate(href, { state: RESUME_STATE });
                }}
                className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-primary hover:bg-primary-dark text-gray-900"
              >
                Học tiếp
              </button>
            )}
          </>
        ) : (
          <>
            <MiniScore icon={<ExerciseIcon size={15} />} label="Bài tập" value={attempt.exercise?.score100} />
            <MiniScore icon={<HeadphoneIcon size={15} />} label="Phát âm" value={attempt.speaking?.avgScore} />
          </>
        )}
        <span className="hidden sm:flex w-8 h-8 ml-1 rounded-full items-center justify-center text-gray-300 group-hover:text-primary-dark transition">
          <ChevronRightIcon />
        </span>
      </div>
    </Link>
  );
}
