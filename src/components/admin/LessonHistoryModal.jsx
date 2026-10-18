import { useState } from "react";
import AttemptDetail from "../history/AttemptDetail.jsx";
import {
  useStudentHistory,
  useStudentAttempt,
  studentRecordingPath,
} from "../../hooks/useLessonHistory.js";
import { formatDate, MiniScore, CourseBadge } from "../../pages/LessonHistoryPage.jsx";

/**
 * Lịch sử hoàn thành bài học của một học viên — màn đối chiếu của giáo viên.
 *
 * Thay cho PracticeHistoryModal cũ. Cái cũ liệt kê TỪNG LƯỢT ĐỌC rời rạc, kể
 * cả những lượt học viên đọc thử rồi đọc lại, nên rất khó trả lời câu hỏi
 * thực tế: "em này đã học xong bài nào, được bao nhiêu điểm". Màn này đi từ
 * bài học xuống, và dùng CHUNG component chi tiết với màn của học viên — khi
 * họ gọi điện khiếu nại thì hai bên đang nhìn cùng một thứ.
 */
export default function LessonHistoryModal({ student, onClose, onOpenDeepDive }) {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);

  const { data, isLoading, isError, error } = useStudentHistory(student?._id, page);
  const items = data?.data || [];
  const pagination = data?.pagination;

  if (!student) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-heading font-semibold">Lịch sử học</h2>
            <p className="text-sm text-gray-500 truncate">
              {student.name} · {student.phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 shrink-0"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
          {isError && <p className="text-sm text-red-600">{error.message}</p>}

          {!isLoading && !isError && items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                Học viên này chưa hoàn thành bài học nào.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Lịch sử chỉ được ghi khi học viên đi hết cả bài. Làm dở rồi
                thoát thì không có bản ghi nào.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mb-3">
                {pagination.total} lượt hoàn thành
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

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <span className="text-xs text-gray-500">
                    Trang {pagination.page}/{pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40"
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
          <div className="px-5 py-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onOpenDeepDive}
              className="text-xs text-gray-500 hover:text-primary-dark hover:underline"
            >
              Xem chi tiết chấm từng chữ của mọi lượt đọc →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AttemptCard({ attempt, studentId, open, onToggle }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {attempt.lessonTitle || "Bài học"}
            </p>
            <CourseBadge attempt={attempt} />
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {formatDate(attempt.completedAt)}
          </p>
        </div>
        <MiniScore label="Bài tập" value={attempt.exercise?.score100} />
        <MiniScore label="Phát âm" value={attempt.speaking?.avgScore} />
        <span className={"text-gray-400 transition-transform " + (open ? "rotate-180" : "")}>
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

  if (isLoading) {
    return <p className="px-3 pb-3 text-xs text-gray-400">Đang tải chi tiết...</p>;
  }
  if (isError) {
    return <p className="px-3 pb-3 text-xs text-red-600">{error.message}</p>;
  }
  return (
    <div className="px-3 pb-3 border-t border-gray-100 pt-3">
      <AttemptDetail
        attempt={data}
        recordingPath={(id) => studentRecordingPath(studentId, id)}
      />
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
