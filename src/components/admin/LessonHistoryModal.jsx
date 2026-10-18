import { useState } from "react";
import AttemptDetail from "../history/AttemptDetail.jsx";
import {
  useStudentHistory,
  useStudentAttempt,
  studentRecordingPath,
} from "../../hooks/useLessonHistory.js";
import { formatDate } from "../../pages/LessonHistoryPage.jsx";

/**
 * Lịch sử hoàn thành bài học của một học viên — màn đối chiếu của giáo viên.
 *
 * Đi từ bài học xuống: mỗi dòng là một lượt học viên hoàn thành trọn bài,
 * bấm mở ra để xem bài tập và luyện nói (chia theo từng video) của lượt đó.
 */
export default function LessonHistoryModal({ student, onClose, onOpenDeepDive }) {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);

  const { data, isLoading, isError, error } = useStudentHistory(student?._id, page);
  const items = data?.data || [];
  const pagination = data?.pagination;
  const stats = data?.stats;

  if (!student) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-gray-50 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------- đầu modal ---------- */}
        <div className="bg-white px-5 py-4 border-b border-gray-200 flex items-center gap-3 shrink-0">
          <span className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center font-semibold text-gray-800 shrink-0">
            {student.name?.trim()?.[0]?.toUpperCase() || "H"}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-heading font-semibold text-gray-900 leading-tight">
              Lịch sử học · {student.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{student.phone}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {isLoading && <ListSkeleton />}
          {isError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error.message}
            </p>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 text-center px-6 py-10">
              <p className="text-sm font-medium text-gray-700">Học viên này chưa hoàn thành bài học nào.</p>
              <p className="text-xs text-gray-400 mt-1">
                Lịch sử chỉ được ghi khi học viên đi hết cả bài. Làm dở rồi thoát thì không có bản ghi nào.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <>
              {/* Tổng quan trên TOÀN BỘ lịch sử, không theo trang đang xem —
                  trả lời nhanh "em này học tới đâu rồi". */}
              {stats && <StatsRow stats={stats} />}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 px-1">
                  Các lượt hoàn thành
                </p>
                <div className="space-y-2">
                  {items.map((a) => (
                    <AttemptCard
                      key={a._id}
                      attempt={a}
                      studentId={student._id}
                      open={openId === a._id}
                      onToggle={() => setOpenId(openId === a._id ? null : a._id)}
                    />
                  ))}
                </div>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3.5 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <span className="text-xs text-gray-500">
                    Trang {pagination.page}/{pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= pagination.totalPages}
                    className="px-3.5 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Lớp đào sâu: chấm TỪNG CHỮ, điểm gốc iFLYTEK, cờ xử lý âm thanh.
            Để riêng vì 95% thời gian giáo viên chỉ cần điểm và bản ghi âm —
            nhưng khi học viên khiếu nại "em đọc đúng mà bị chấm sai" thì đây
            là chỗ duy nhất trả lời được. */}
        {onOpenDeepDive && (
          <div className="bg-white px-5 py-3 border-t border-gray-200 shrink-0">
            <button
              type="button"
              onClick={onOpenDeepDive}
              className="text-xs font-medium text-gray-500 hover:text-primary-dark"
            >
              Xem chi tiết chấm từng chữ của mọi lượt đọc →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const scoreText = (v) =>
  v === null || v === undefined
    ? "text-gray-300"
    : v >= 80
      ? "text-green-600"
      : v >= 60
        ? "text-amber-600"
        : "text-red-500";

function StatsRow({ stats }) {
  const items = [
    { label: "Lượt hoàn thành", value: stats.totalCompletions, cls: "text-gray-900" },
    { label: "Bài đã học", value: stats.distinctLessons, cls: "text-gray-900" },
    { label: "Bài tập trung bình", value: stats.exerciseAvg, cls: scoreText(stats.exerciseAvg) },
    { label: "Phát âm trung bình", value: stats.speakingAvg, cls: scoreText(stats.speakingAvg) },
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden">
      {items.map((it) => (
        <div key={it.label} className="bg-white px-4 py-3">
          <p className="text-[11px] text-gray-500">{it.label}</p>
          <p className={"text-2xl font-bold leading-tight mt-0.5 tabular-nums " + it.cls}>{it.value ?? "—"}</p>
        </div>
      ))}
    </div>
  );
}

function ScoreCell({ label, value }) {
  const has = value !== null && value !== undefined;
  return (
    <div className="w-[4.5rem] text-right">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={"text-lg font-bold leading-tight tabular-nums " + scoreText(value)}>{has ? value : "—"}</p>
    </div>
  );
}

function AttemptCard({ attempt, studentId, open, onToggle }) {
  const course = attempt.courseName || attempt.courseSlug;
  return (
    <div
      className={
        "bg-white rounded-xl border overflow-hidden transition " +
        (open ? "border-primary-dark/50 shadow-md" : "border-gray-200 hover:border-gray-300")
      }
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[15px] font-semibold text-gray-900 truncate">{attempt.lessonTitle || "Bài học"}</p>
            {course && (
              <span
                className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                title={attempt.curriculumName || undefined}
              >
                {course}
              </span>
            )}
            {/* Lần thứ mấy của CHÍNH BÀI NÀY, đếm trên toàn bộ lịch sử. */}
            {attempt.lessonAttemptCount > 1 && attempt.attemptNo && (
              <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                Lần {attempt.attemptNo}/{attempt.lessonAttemptCount}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(attempt.completedAt)}</p>
        </div>

        <ScoreCell label="Bài tập" value={attempt.exercise?.score100} />
        <ScoreCell label="Phát âm" value={attempt.speaking?.avgScore} />
        <span
          className={
            "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 transition " +
            (open ? "bg-gray-100 rotate-180" : "")
          }
        >
          <ChevronIcon />
        </span>
      </button>

      {/* Chỉ gọi API chi tiết khi giáo viên thực sự mở ra. Một học viên có thể
          có hàng chục lượt; tải hết chi tiết ngay khi mở modal là thừa. */}
      {open && <AttemptBody studentId={studentId} attemptId={attempt._id} />}
    </div>
  );
}

function AttemptBody({ studentId, attemptId }) {
  const { data, isLoading, isError, error } = useStudentAttempt(studentId, attemptId);

  return (
    <div className="border-t border-gray-100 bg-gray-50/70 p-4">
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
          <div className="h-32 rounded-xl bg-gray-200/70 animate-pulse" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <AttemptDetail attempt={data} recordingPath={(id) => studentRecordingPath(studentId, id)} />
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-[72px] rounded-xl bg-gray-200/70 animate-pulse" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 rounded-xl bg-gray-200/60 animate-pulse" />
      ))}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
