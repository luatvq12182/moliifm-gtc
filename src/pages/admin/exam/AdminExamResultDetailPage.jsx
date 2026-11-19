import { Link, useNavigate, useParams } from "react-router-dom";
import { useDeleteExamAttempt, useExamAttempt, useRegradeExamAttempt } from "../../../hooks/useExam.js";
import ExamResultView, { ScoreSummary } from "../../../components/exam/ExamResultView.jsx";
import { useConfirm } from "../../../components/admin/ConfirmDialog.jsx";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";

const fmt = (d) => (d ? new Date(d).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

/** Luyện thi HSK 3.0 — chi tiết một bài làm: thông tin thí sinh, từng câu, chấm lại, xoá. */
export default function AdminExamResultDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: a, isLoading, isError, error } = useExamAttempt(id);
  const regrade = useRegradeExamAttempt();
  const remove = useDeleteExamAttempt();
  const { confirm, dialog } = useConfirm();
  const toast = useToasts();

  const doRegrade = async () => {
    if (!(await confirm({ title: "Chấm lại bài này?", message: "Chấm lại theo đáp án hiện tại của đề, AI chấm lại phần đặt câu (mất vài chục giây, tính vào chi phí AI)." }))) return;
    try {
      await regrade.mutateAsync(id);
      toast.success("Đã chấm lại.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const doDelete = async () => {
    if (!(await confirm({ title: "Xoá bài làm này?", message: "Học viên sẽ không xem lại được kết quả này nữa. Không hoàn tác được.", confirmLabel: "Xoá", tone: "danger" }))) return;
    try {
      await remove.mutateAsync(id);
      navigate("/admin/exam/results");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-5xl">
      <Link to="/admin/exam/results" className="text-sm text-gray-500 hover:text-gray-800">
        ← Kết quả luyện thi
      </Link>
      {isLoading && <p className="p-6 text-sm text-gray-400">Đang tải...</p>}
      {isError && <p className="p-6 text-sm text-red-600">{error.message}</p>}
      {a && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 mt-2 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-heading font-semibold">{a.candidate.name}</h1>
              <dl className="mt-2 grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-1 text-sm">
                <Row label="Số điện thoại">{a.candidate.phone || "—"}</Row>
                <Row label="Lớp">{a.candidate.classCode || "—"}</Row>
                <Row label="Tài khoản">{a.student ? `${a.student.name} · ${a.student.phone}` : "—"}</Row>
                <Row label="Đề">
                  {a.title}
                  {a.level?.name && <span className="text-gray-500"> · {a.level.name}</span>}
                </Row>
                <Row label="Bắt đầu">{fmt(a.startedAt)}</Row>
                <Row label="Nộp lúc">
                  {a.status === "submitted" ? fmt(a.submittedAt) : "Đang làm"}
                  {a.submitReason === "time" && <span className="ml-1.5 text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">hết giờ, tự nộp</span>}
                </Row>
              </dl>
            </div>
            <div className="flex gap-2 shrink-0">
              {a.status === "submitted" && (
                <button type="button" onClick={doRegrade} disabled={regrade.isPending} className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50">
                  {regrade.isPending ? "Đang chấm lại…" : "Chấm lại"}
                </button>
              )}
              <button type="button" onClick={doDelete} className="text-sm px-4 py-2 rounded-lg text-red-600 hover:bg-red-50">
                Xoá bài làm
              </button>
            </div>
          </div>
          {a.status === "submitted" ? (
            <div className="space-y-4">
              <ScoreSummary result={a.result} />
              <ExamResultView result={a.result} groups={a.groups} explanations={a.explanations || {}} />
            </div>
          ) : (
            <p className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-500">Học viên đang làm bài này (phần {a.sections.find((x) => x.id === a.section)?.label || "—"}). Có kết quả sau khi nộp.</p>
          )}
        </>
      )}
      {dialog}
      <ToastStack toasts={toast.items} onDismiss={toast.dismiss} />
    </div>
  );
}

/** Một dòng nhãn / giá trị trong bảng thông tin bài làm. */
function Row({ label, children }) {
  return (
    <>
      <dt className="text-gray-500 whitespace-nowrap">{label}</dt>
      <dd className="text-gray-900 min-w-0 truncate">{children}</dd>
    </>
  );
}
