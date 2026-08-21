import { useEffect, useRef, useState } from "react";
import {
  usePracticeAttemptsQuery,
  fetchAttemptAudioUrl,
  useDeletePracticeHistory,
} from "../../hooks/usePracticeHistory.js";

const RHYTHM_ISSUES = ["đọc thừa", "đọc thiếu", "đọc lặp"];

function charStyle(c) {
  if (c.ok) return "text-green-700 bg-green-50 border-green-200";
  if (RHYTHM_ISSUES.includes(c.issue))
    return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("vi-VN");
}

function formatDuration(ms) {
  if (!ms) return "";
  return `${(ms / 1000).toFixed(1)}s`;
}

// Lịch sử luyện nói của một học viên — công cụ ĐỐI CHỨNG khi có khiếu nại
// "tôi đọc đúng mà bị chấm sai": mở ra, nghe lại đúng bản ghi đó, so với điểm
// mà iFLYTEK đã trả về tại thời điểm đó.
export default function PracticeHistoryModal({ student, onClose }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = usePracticeAttemptsQuery({
    studentId: student?._id,
    page,
  });
  const deleteHistory = useDeletePracticeHistory();

  const attempts = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleDeleteAll = () => {
    if (
      !window.confirm(
        `Xoá toàn bộ lịch sử luyện nói của ${student.name}?\n\nCả bản ghi âm trên máy chủ cũng bị xoá. Không khôi phục được.`,
      )
    )
      return;
    deleteHistory.mutate(student._id, {
      onError: (err) => alert(err.message),
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              Lịch sử luyện nói — {student?.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {pagination.total} lượt đọc · {student?.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {isLoading && (
            <p className="text-sm text-gray-400">Đang tải lịch sử...</p>
          )}
          {isError && <p className="text-sm text-red-600">{error.message}</p>}

          {!isLoading && !isError && attempts.length === 0 && (
            <p className="text-sm text-gray-400">
              Học viên này chưa có lượt luyện nói nào được ghi lại.
            </p>
          )}

          <div className="space-y-3">
            {attempts.map((attempt) => (
              <AttemptRow
                key={attempt._id}
                attempt={attempt}
                studentId={student._id}
              />
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleDeleteAll}
            disabled={deleteHistory.isPending || pagination.total === 0}
            className="text-xs text-red-600 hover:underline disabled:opacity-40"
          >
            {deleteHistory.isPending ? "Đang xoá..." : "Xoá toàn bộ lịch sử"}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 disabled:opacity-40"
            >
              Trước
            </button>
            <span className="text-xs text-gray-500">
              {pagination.page}/{pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (pagination.totalPages || 1)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttemptRow({ attempt, studentId }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <ScoreBadge score={attempt.pronScore} rejected={attempt.isRejected} />

        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-gray-900">
            {attempt.referenceText}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {attempt.lessonTitle || attempt.lessonSlug || "—"}
            {attempt.lineIndex >= 0 && ` · câu ${attempt.lineIndex + 1}`}
            {attempt.words?.length
              ? ` · ${attempt.words.filter((w) => w.status !== "good").length}/${attempt.words.length} từ cần luyện`
              : ""}
            {" · "}
            {formatDateTime(attempt.createdAt)}
            {attempt.durationMs ? ` · ${formatDuration(attempt.durationMs)}` : ""}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {attempt.hasAudio && (
            <AttemptAudioButton studentId={studentId} attemptId={attempt._id} />
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-gray-500 underline whitespace-nowrap"
          >
            {expanded ? "Thu gọn" : "Chi tiết"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-3">
          {/* Điểm GỐC của iFLYTEK (thang 100), giữ nguyên không quy đổi.
              Điểm hiển thị cho học viên tính theo công thức riêng — xem
              gtc-api/src/lib/pronunciationScore.js. Lưu cả hai để có thể chấm
              lại toàn bộ lịch sử bằng công thức khác mà không cần ghi âm lại. */}
          <p className="text-[11px] text-gray-400">Điểm gốc iFLYTEK:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <RawScore label="Phát âm" value={attempt.rawScores?.phone_score} />
            <RawScore label="Thanh điệu" value={attempt.rawScores?.tone_score} />
            <RawScore label="Trôi chảy" value={attempt.rawScores?.fluency_score} />
            <RawScore label="Đầy đủ" value={attempt.rawScores?.integrity_score} />
          </div>

          <div>
            <p className="text-[11px] text-gray-400 mb-1">Nội dung đã đọc (iFLYTEK nghe được):</p>
            <p className="text-sm bg-white rounded-lg border border-gray-200 px-3 py-2">
              {attempt.spokenText || "— không nghe rõ —"}
            </p>
          </div>

          {attempt.words?.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 mb-1">
                Đánh giá theo từ
                {attempt.wordGroupingMethod
                  ? ` (phân từ: ${attempt.wordGroupingMethod})`
                  : ""}
                :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {attempt.words.map((w, i) => (
                  <span
                    key={i}
                    className={
                      "px-2 py-1 rounded-lg border text-sm " +
                      (w.status === "good"
                        ? "text-green-700 bg-green-50 border-green-200"
                        : w.status === "fair"
                          ? "text-amber-700 bg-amber-50 border-amber-200"
                          : "text-red-700 bg-red-50 border-red-200")
                    }
                  >
                    {w.content}
                    <span className="text-[10px] opacity-70 ml-1">{w.score}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {attempt.feedback && (
            <div>
              <p className="text-[11px] text-gray-400 mb-1">Phản hồi đã hiện cho học viên:</p>
              <p className="text-sm bg-white rounded-lg border border-gray-200 px-3 py-2">
                {attempt.feedback}
              </p>
            </div>
          )}

          {attempt.chars?.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 mb-1">Chi tiết từng chữ (dữ liệu thô iFLYTEK):</p>
              <div className="flex flex-wrap gap-1.5">
              {attempt.chars.map((c, i) => (
                <div
                  key={i}
                  className={
                    "flex flex-col items-center px-2 py-1 rounded-lg border " +
                    charStyle(c)
                  }
                >
                  <span className="text-sm font-medium leading-tight">
                    {c.content}
                  </span>
                  {!c.ok && c.issue && (
                    <span className="text-[9px] leading-tight">{c.issue}</span>
                  )}
                </div>
                ))}
              </div>
            </div>
          )}

          {/* Bối cảnh kỹ thuật — chính là thứ trả lời "vì sao máy này chấm khác
              máy kia". Nếu noiseSuppression/autoGainControl hiện "bật" dù client
              đã xin tắt, nghĩa là hệ điều hành hoặc trình duyệt đã đè lên. */}
          <div className="text-[11px] text-gray-500 border-t border-gray-200 pt-2 space-y-0.5">
            <p>
              <span className="text-gray-400">Micro:</span>{" "}
              {attempt.client?.micLabel || "—"}
              {attempt.client?.micSampleRate
                ? ` · ${attempt.client.micSampleRate}Hz`
                : ""}
              {attempt.client?.captureMode
                ? ` · ${attempt.client.captureMode}`
                : ""}
            </p>
            <p>
              <span className="text-gray-400">Hạ tần số về 16kHz:</span>{" "}
              <ResampleFlag
                mode={attempt.client?.resampleMode}
                contextRate={attempt.client?.contextSampleRate}
              />
            </p>
            <p>
              <span className="text-gray-400">Xử lý âm thanh thực tế:</span>{" "}
              <ProcessingFlag label="khử vọng" value={attempt.client?.echoCancellation} />
              {" · "}
              <ProcessingFlag label="khử ồn" value={attempt.client?.noiseSuppression} />
              {" · "}
              <ProcessingFlag label="tự chỉnh âm lượng" value={attempt.client?.autoGainControl} />
            </p>
            <p className="truncate">
              <span className="text-gray-400">Thiết bị:</span>{" "}
              {attempt.client?.userAgent || "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Cờ "bật" hiện màu đỏ vì với việc chấm phát âm thì đây là trạng thái XẤU —
// nghĩa là nền tảng đã đè lên yêu cầu tắt của chúng ta.
function ProcessingFlag({ label, value }) {
  if (value === null || value === undefined)
    return <span className="text-gray-400">{label}: ?</span>;
  return (
    <span className={value ? "text-red-600 font-medium" : "text-green-600"}>
      {label}: {value ? "BẬT" : "tắt"}
    </span>
  );
}

// Nhánh hạ tần số nào đã chạy. 'browser' là đường tốt nhất: AudioContext chạy
// thẳng ở 16kHz nên chính trình duyệt resample bằng bộ lọc chuẩn của nó.
// 'fallback-biquad' nghĩa là trình duyệt từ chối 16kHz, đang dùng chuỗi biquad
// của ta — vẫn chống được aliasing nhưng kém sắc hơn, hy sinh một phần dải
// 6-8kHz (chính là dải phân biệt s/sh/x).
function ResampleFlag({ mode, contextRate }) {
  if (!mode) return <span className="text-gray-400">—</span>;
  if (mode === "browser") {
    return (
      <span className="text-green-600">
        bộ resample của trình duyệt (AudioContext {contextRate || 16000}Hz)
      </span>
    );
  }
  return (
    <span className="text-amber-600 font-medium">
      nhánh dự phòng biquad (AudioContext {contextRate || "?"}Hz — trình duyệt
      từ chối 16kHz)
    </span>
  );
}

function RawScore({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-2 py-1.5 text-center">
      <p className="text-[10px] text-gray-400 leading-none">{label}</p>
      <p className="text-sm font-semibold mt-1">
        {typeof value === "number" ? Math.round(value) : "—"}
        <span className="text-[10px] font-normal text-gray-400">/100</span>
      </p>
    </div>
  );
}

function ScoreBadge({ score, rejected }) {
  if (rejected || typeof score !== "number") {
    return (
      <span className="shrink-0 w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] text-center leading-tight px-1">
        Bị từ chối
      </span>
    );
  }
  const tone =
    score >= 85
      ? "bg-green-100 text-green-700"
      : score >= 70
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  return (
    <span
      className={
        "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold " +
        tone
      }
    >
      {score}
    </span>
  );
}

// Tải bản ghi âm theo yêu cầu (lazy) — danh sách có thể dài, không nên tải sẵn
// hàng chục file WAV khi mở modal.
function AttemptAudioButton({ studentId, attemptId }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const urlRef = useRef("");

  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const toggle = async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }

    let playableUrl = url;
    if (!playableUrl) {
      setLoading(true);
      try {
        playableUrl = await fetchAttemptAudioUrl(studentId, attemptId);
        setUrl(playableUrl);
      } catch (err) {
        alert(err.message);
        return;
      } finally {
        setLoading(false);
      }
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(playableUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    audioRef.current.play().catch(() => setPlaying(false));
    setPlaying(true);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium hover:bg-amber-200 disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? "Đang tải..." : playing ? "◼ Dừng" : "▶ Nghe"}
    </button>
  );
}
