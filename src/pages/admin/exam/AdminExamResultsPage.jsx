import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../../lib/apiClient.js";
import { examAttemptQuery, useAdminExamLevels, useAdminExamTests, useExamAttempts } from "../../../hooks/useExam.js";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";

const PAGE_SIZE = 20;
const AI_LABEL = { none: "", pending: "AI đang chấm", done: "", error: "AI lỗi", limited: "Hết lượt AI", unavailable: "Chưa có AI" };

const fmt = (d) => (d ? new Date(d).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "");

/**
 * Luyện thi HSK 3.0 — kết quả bài làm của học viên: lọc theo cấp / đề /
 * trạng thái, tìm theo tên, SĐT, mã lớp; tải về CSV (mở bằng Excel).
 */
export default function AdminExamResultsPage() {
  const [params, setParams] = useSearchParams();
  const levelId = params.get("levelId") || "";
  const testId = params.get("testId") || "";
  const status = params.get("status") || "";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const toast = useToasts();
  const [exporting, setExporting] = useState(false);

  const { data: levels = [] } = useAdminExamLevels();
  const { data: tests = [] } = useAdminExamTests(levelId);
  const { data, isLoading, isError, error } = useExamAttempts({ levelId, testId, status, search, page, limit: PAGE_SIZE });
  const rows = data?.data || [];
  const pagination = data?.pagination;

  const setFilter = (patch) => {
    setPage(1);
    const next = { levelId, testId, status, ...patch };
    if (patch.levelId !== undefined) next.testId = "";
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/admin/exam/attempts?${examAttemptQuery({ levelId, testId, status, search, page: 1, limit: 1000 })}`);
      const head = ["Họ tên thí sinh", "SĐT thí sinh", "Mã lớp", "Tài khoản", "SĐT tài khoản", "Cấp", "Đề", "Bắt đầu", "Nộp lúc", "Trạng thái", "Nghe", "Đọc", "Viết", "Tổng", "Tối đa", "Kết quả", "AI"];
      const lines = res.data.map((a) => {
        const r = a.result;
        const sec = (s) => r?.sections?.[s]?.score ?? "";
        return [
          a.candidate.name,
          a.candidate.phone,
          a.candidate.classCode,
          a.student?.name || "",
          a.student?.phone || "",
          a.level?.name || "",
          a.title,
          fmt(a.startedAt),
          fmt(a.submittedAt),
          a.status === "submitted" ? (a.submitReason === "time" ? "Hết giờ, tự nộp" : "Đã nộp") : "Đang làm",
          sec("listening"),
          sec("reading"),
          sec("writing"),
          r?.total ?? "",
          r?.max ?? "",
          r ? (r.passed ? "Đạt" : "Chưa đạt") : "",
          AI_LABEL[r?.ai?.status] || "",
        ];
      });
      const csv = [head, ...lines].map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
      // BOM để Excel mở đúng tiếng Việt / chữ Hán.
      const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `ket-qua-luyen-thi-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      if (res.pagination.total > res.data.length) toast.error(`Chỉ tải được ${res.data.length}/${res.pagination.total} bài — hãy lọc nhỏ lại.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  const input = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex-1">
          <h1 className="text-xl font-heading font-semibold">Kết quả luyện thi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bài làm của học viên, điểm từng phần và tổng điểm. Bấm vào một dòng để xem từng câu.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={exporting || !pagination?.total} className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50">
          {exporting ? "Đang tải…" : "Tải CSV (Excel)"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select value={levelId} onChange={(e) => setFilter({ levelId: e.target.value })} className={input} aria-label="Cấp thi">
          <option value="">Mọi cấp thi</option>
          {levels.map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </select>
        <select value={testId} onChange={(e) => setFilter({ testId: e.target.value })} className={input} disabled={!levelId} aria-label="Đề">
          <option value="">{levelId ? "Mọi đề" : "Chọn cấp để lọc theo đề"}</option>
          {tests.map((t) => (
            <option key={t._id} value={t._id}>
              {t.title}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setFilter({ status: e.target.value })} className={input} aria-label="Trạng thái">
          <option value="">Mọi trạng thái</option>
          <option value="submitted">Đã nộp</option>
          <option value="in_progress">Đang làm</option>
        </select>
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Tìm tên, SĐT, mã lớp"
          className={input}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        {isLoading && <p className="p-6 text-sm text-gray-400">Đang tải...</p>}
        {isError && <p className="p-6 text-sm text-red-600">{error.message}</p>}
        {!isLoading && !isError && rows.length === 0 && <p className="p-6 text-sm text-gray-500 text-center">Chưa có bài làm nào khớp.</p>}
        {rows.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-2.5 font-medium">Thí sinh</th>
                <th className="px-4 py-2.5 font-medium">Đề</th>
                <th className="px-4 py-2.5 font-medium">Nộp lúc</th>
                <th className="px-4 py-2.5 font-medium text-center">Nghe</th>
                <th className="px-4 py-2.5 font-medium text-center">Đọc</th>
                <th className="px-4 py-2.5 font-medium text-center">Viết</th>
                <th className="px-4 py-2.5 font-medium text-center">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const r = a.result;
                const sec = (s) => (r?.sections?.[s] ? r.sections[s].score : "—");
                return (
                  <tr key={a._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 min-w-[180px]">
                      <Link to={`/admin/exam/results/${a._id}`} className="font-medium text-gray-900 hover:underline">
                        {a.candidate.name}
                      </Link>
                      <span className="block text-xs text-gray-500">
                        {a.candidate.phone}
                        {a.candidate.classCode && ` · lớp ${a.candidate.classCode}`}
                      </span>
                      {a.student && a.student.phone !== a.candidate.phone && <span className="block text-[11px] text-gray-400">TK: {a.student.name} · {a.student.phone}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-gray-800">{a.title}</span>
                      <span className="block text-xs text-gray-400">{a.level?.name}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {a.status === "submitted" ? (
                        <>
                          {fmt(a.submittedAt)}
                          {a.submitReason === "time" && <span className="block text-[11px] text-gray-400">hết giờ, tự nộp</span>}
                        </>
                      ) : (
                        <span className="text-amber-700">Đang làm</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">{sec("listening")}</td>
                    <td className="px-4 py-2.5 text-center">{sec("reading")}</td>
                    <td className="px-4 py-2.5 text-center">
                      {sec("writing")}
                      {AI_LABEL[r?.ai?.status] && <span className="block text-[10px] text-amber-700">{AI_LABEL[r.ai.status]}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      {r ? (
                        <span className={"text-xs font-semibold px-2 py-1 rounded-full " + (r.passed ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700")}>
                          {r.total}/{r.max}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white disabled:opacity-40">
            Trước
          </button>
          <span className="text-xs text-gray-500">
            Trang {pagination.page}/{pagination.totalPages} · {pagination.total} bài
          </span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white disabled:opacity-40">
            Sau
          </button>
        </div>
      )}
      <ToastStack toasts={toast.items} onDismiss={toast.dismiss} />
    </div>
  );
}
