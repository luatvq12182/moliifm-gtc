import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  useAdminExamLevels,
  useAdminExamTests,
  useCreateExamTest,
  useDeleteExamTest,
  useExamTemplates,
  useReorderExamTests,
  useUpdateExamTest,
} from "../../../hooks/useExam.js";
import { useConfirm } from "../../../components/admin/ConfirmDialog.jsx";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";

/**
 * Luyện thi HSK 3.0 — danh sách đề luyện của một cấp thi: tạo đề theo mẫu,
 * sắp xếp, ẩn/hiện, vào trang soạn đề. Đề chỉ hiện cho học viên khi đủ file
 * đề, file nghe và đáp án (máy chủ kiểm).
 */
export default function AdminExamTestsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: levels = [] } = useAdminExamLevels();
  const levelId = params.get("levelId") || levels[0]?._id || "";
  const { data: tests = [], isLoading, isError, error } = useAdminExamTests(levelId);
  const { data: templates = [] } = useExamTemplates();

  const create = useCreateExamTest();
  const update = useUpdateExamTest();
  const remove = useDeleteExamTest();
  const reorder = useReorderExamTests();
  const { confirm, dialog } = useConfirm();
  const toast = useToasts();

  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("hsk3");

  const input = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  const doCreate = async (e) => {
    e.preventDefault();
    try {
      const t = await create.mutateAsync({ levelId, title: title.trim(), template });
      navigate(`/admin/exam/tests/${t._id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const move = (i, delta) => {
    const ids = tests.map((t) => t._id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate({ levelId, ids }, { onError: (err) => toast.error(err.message) });
  };

  const toggleStatus = (t) =>
    update.mutate(
      { id: t._id, payload: { status: t.status === "published" ? "draft" : "published" } },
      {
        onSuccess: () => toast.success(t.status === "published" ? `Đã ẩn "${t.title}".` : `Học viên đã thấy "${t.title}".`),
        onError: (err) => toast.error(err.message),
      },
    );

  const handleDelete = async (t) => {
    if (
      !(await confirm({
        title: `Xoá "${t.title}"?`,
        message: "Xoá cả file đề, file nghe và đáp án. Không hoàn tác được.",
        confirmLabel: "Xoá",
        tone: "danger",
      }))
    )
      return;
    remove.mutate(t._id, { onSuccess: () => toast.success("Đã xoá đề."), onError: (err) => toast.error(err.message) });
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-heading font-semibold">Đề luyện thi</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Mỗi đề gồm file đề PDF, file nghe và đáp án. Đề chỉ hiện cho học viên khi đã đủ cả ba.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Cấp thi</label>
        <select value={levelId} onChange={(e) => setParams({ levelId: e.target.value })} className={input + " w-full sm:w-80"}>
          {levels.length === 0 && <option value="">Chưa có cấp thi — tạo ở mục “Cấp thi”</option>}
          {levels.map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
              {l.status !== "published" ? " (nháp)" : ""}
            </option>
          ))}
        </select>
      </div>

      {levelId && (
        <form onSubmit={doCreate} className="rounded-xl border-2 border-dashed border-gray-300 p-4 bg-white mb-4 flex flex-col sm:flex-row sm:items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Tên đề</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Để trống = "Đề ${tests.length + 1}"`} className={input + " w-full"} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Cấu trúc</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value)} className={input + " w-full sm:w-80"}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60 shrink-0"
          >
            {create.isPending ? "Đang tạo..." : "+ Tạo đề"}
          </button>
        </form>
      )}

      {isLoading && <p className="p-6 text-sm text-gray-400">Đang tải...</p>}
      {isError && <p className="p-6 text-sm text-red-600">{error.message}</p>}
      {levelId && !isLoading && (
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {tests.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 text-center">Cấp này chưa có đề nào.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tests.map((t, i) => (
                <li key={t._id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded border border-gray-200 text-gray-500 disabled:opacity-30" title="Lên">
                        ↑
                      </button>
                      <button onClick={() => move(i, 1)} disabled={i === tests.length - 1} className="w-7 h-7 rounded border border-gray-200 text-gray-500 disabled:opacity-30" title="Xuống">
                        ↓
                      </button>
                    </div>
                    <div className="min-w-0">
                      <Link to={`/admin/exam/tests/${t._id}`} className="font-medium text-gray-900 hover:underline">
                        {t.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.questionCount} câu ·{" "}
                        {t.conversion === "processing" ? "đang chuyển PDF…" : t.pageCount ? `${t.pageCount} trang đề` : "chưa có PDF"} ·{" "}
                        {t.hasAudio ? "có file nghe" : "chưa có file nghe"}
                        {t.submittedCount > 0 && (
                          <>
                            {" · "}
                            <Link to={`/admin/exam/results?levelId=${levelId}&testId=${t._id}`} className="text-primary-dark hover:underline">
                              {t.submittedCount} bài đã nộp
                            </Link>
                          </>
                        )}
                      </p>
                      {t.ready ? (
                        <p className="text-xs text-green-700 mt-0.5">✓ Đủ điều kiện hiện cho học viên</p>
                      ) : (
                        <p className="text-xs text-amber-700 mt-0.5" title={t.missing.join("\n")}>
                          Còn thiếu: {t.missing.join(" ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleStatus(t)}
                      className={
                        "text-xs font-medium px-2.5 py-1.5 rounded-lg border " +
                        (t.status === "published" ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500")
                      }
                      title="Bấm để đổi"
                    >
                      {t.status === "published" ? "Đang hiện" : "Nháp (ẩn)"}
                    </button>
                    <Link to={`/admin/exam/tests/${t._id}`} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
                      Soạn đề
                    </Link>
                    <button onClick={() => handleDelete(t)} className="text-xs px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50">
                      Xoá
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {dialog}
      <ToastStack toasts={toast.items} onDismiss={toast.dismiss} />
    </div>
  );
}
