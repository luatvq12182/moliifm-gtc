import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminExamLevels, useExamAccess, useUpdateExamAccess } from "../../../hooks/useExam.js";
import { useConfirm } from "../../../components/admin/ConfirmDialog.jsx";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";

const PAGE_SIZE = 20;
const MAX_PER_CALL = 500; // phải khớp trần ở máy chủ (updateAccess)

/**
 * Cấp / thu hồi quyền vào phần Luyện thi HSK 3.0 (theo từng cấp thi).
 *
 * Cùng cách với trang cấp quyền học liệu: mỗi dòng một học viên, mỗi cấp thi
 * một cột có công tắc — bật là được vào, tắt là thôi, lưu ngay. Cần cấp cho cả lớp thì tích
 * chọn nhiều người rồi dùng thanh thao tác hiện ra phía trên bảng. Lựa chọn
 * giữ xuyên trang, và bị xoá khi đổi bộ lọc / từ khoá — kẻo cấp nhầm cho nhóm
 * không còn nhìn thấy trên màn hình.
 */
export default function AdminExamAccessPage() {
  const [params] = useSearchParams();
  const { data: courses = [], isLoading: coursesLoading } = useAdminExamLevels();

  // Bộ lọc: "all" | "has:<levelId>" | "missing:<levelId>". Vào từ trang
  // Cấp thi (bấm "N học viên") -> lọc sẵn người đang được vào cấp đó.
  const [filter, setFilter] = useState(() => (params.get("levelId") ? `has:${params.get("levelId")}` : "all"));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkCourse, setBulkCourse] = useState("");
  // Công tắc vừa bấm, chờ máy chủ lưu: "<studentId>:<courseId>" -> trạng thái mới.
  const [pending, setPending] = useState(() => new Map());

  const [scope, filterCourse] = filter === "all" ? ["all", ""] : filter.split(":");
  const { data, isLoading, isError, error } = useExamAccess({ levelId: filterCourse, scope, search, page, limit: PAGE_SIZE });
  const update = useUpdateExamAccess();
  const { confirm, dialog } = useConfirm();
  const toast = useToasts();

  const students = useMemo(() => data?.data || [], [data]);
  const pagination = data?.pagination;
  const pageIds = students.map((s) => s._id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const bulkCourseId = bulkCourse || courses[0]?._id || "";
  const courseName = (id) => courses.find((c) => c._id === id)?.name || "";

  const reset = (fn) => (value) => {
    setSelected(new Set());
    setPage(1);
    fn(value);
  };

  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allOnPage ? next.delete(id) : next.add(id)));
      return next;
    });

  const setPendingKey = (key, value) =>
    setPending((prev) => {
      const next = new Map(prev);
      value === undefined ? next.delete(key) : next.set(key, value);
      return next;
    });

  // Bật / tắt một ô. mutateAsync (không phải mutate) vì bấm liền nhiều ô thì
  // callback của mutate chỉ chạy cho lần bấm cuối.
  const flip = async (student, courseId, on) => {
    const key = `${student._id}:${courseId}`;
    if (pending.has(key)) return;
    setPendingKey(key, on);
    try {
      await update.mutateAsync({ studentIds: [student._id], levelId: courseId, action: on ? "grant" : "revoke" });
      toast.success(on ? `${student.name} đã vào được "${courseName(courseId)}".` : `${student.name} không còn vào "${courseName(courseId)}".`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPendingKey(key, undefined);
    }
  };

  const runBulk = async (action) => {
    const ids = Array.from(selected);
    const name = courseName(bulkCourseId);
    if (!ids.length || !bulkCourseId) return;
    if (ids.length > MAX_PER_CALL) return toast.error(`Mỗi lần chỉ xử lý được ${MAX_PER_CALL} học viên. Hãy lọc nhỏ lại.`);
    const grant = action === "grant";
    const ok = await confirm({
      title: grant ? `Cho ${ids.length} học viên vào "${name}"?` : `Thôi cho ${ids.length} học viên vào "${name}"?`,
      message: grant
        ? `${ids.length} học viên đã chọn sẽ vào được phần luyện thi "${name}".`
        : `${ids.length} học viên đã chọn sẽ KHÔNG vào được phần luyện thi "${name}" nữa.`,
      confirmLabel: grant ? "Cho vào" : "Thôi cho vào",
      tone: grant ? "normal" : "danger",
    });
    if (!ok) return;
    try {
      const res = await update.mutateAsync({ studentIds: ids, levelId: bulkCourseId, action });
      setSelected(new Set());
      toast.success(res?.message || "Đã cập nhật quyền.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const input = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-heading font-semibold">Cấp quyền luyện thi</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Bật công tắc ở cột cấp thi để học viên vào được phần luyện thi đó — tắt là thôi. Thay đổi được lưu ngay.
        </p>
      </div>

      {!coursesLoading && courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-500 text-center">
          Chưa có cấp thi nào.{" "}
          <Link to="/admin/exam/levels" className="text-primary-dark hover:underline">
            Tạo cấp thi trước
          </Link>
          , rồi quay lại đây để cấp quyền.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3 flex flex-col sm:flex-row gap-3">
            <input
              value={search}
              onChange={(e) => reset(setSearch)(e.target.value)}
              placeholder="Tìm học viên theo tên, số điện thoại hoặc email"
              className={input + " flex-1"}
            />
            <select value={filter} onChange={(e) => reset(setFilter)(e.target.value)} className={input + " sm:w-64"}>
              <option value="all">Tất cả học viên</option>
              {courses.map((c) => (
                <optgroup key={c._id} label={c.name}>
                  <option value={`has:${c._id}`}>Đang được vào {c.name}</option>
                  <option value={`missing:${c._id}`}>Chưa được vào {c.name}</option>
                </optgroup>
              ))}
            </select>
          </div>

          {/* Thanh thao tác hàng loạt — chỉ hiện khi đã tích chọn học viên. */}
          {selected.size > 0 && (
            <div className="bg-primary/10 border border-primary rounded-xl px-4 py-2.5 mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-800">
                Đã chọn <b>{selected.size}</b> học viên
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">Cấp thi</span>
              <select value={bulkCourseId} onChange={(e) => setBulkCourse(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => runBulk("grant")}
                disabled={update.isPending}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary hover:bg-primary-dark text-gray-900 disabled:opacity-40"
              >
                Cho vào
              </button>
              <button
                onClick={() => runBulk("revoke")}
                disabled={update.isPending}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Thôi cho vào
              </button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-500 underline">
                Bỏ chọn
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
            {isLoading && <p className="p-6 text-sm text-gray-400">Đang tải...</p>}
            {isError && <p className="p-6 text-sm text-red-600">{error.message}</p>}
            {!isLoading && !isError && students.length === 0 && (
              <p className="p-6 text-sm text-gray-500 text-center">Không có học viên nào khớp.</p>
            )}
            {students.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-2.5 w-10">
                      <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Chọn cả trang" />
                    </th>
                    <th className="px-4 py-2.5 font-medium">Học viên</th>
                    {courses.map((c) => (
                      <th key={c._id} className="px-4 py-2.5 font-medium text-center whitespace-nowrap">
                        <span className="text-gray-800">{c.name}</span>
                        {c.status !== "published" && <span className="text-gray-400"> (nháp)</span>}
                        <span className="block text-[11px] font-normal text-gray-400">{c.studentCount || 0} người được vào</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id} className={"border-b border-gray-50 last:border-0 " + (selected.has(s._id) ? "bg-primary/5" : "hover:bg-gray-50/60")}>
                      <td className="px-4 py-2.5">
                        <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggleRow(s._id)} aria-label={`Chọn ${s.name}`} />
                      </td>
                      <td className="px-4 py-2.5 min-w-[180px]">
                        <span className="font-medium text-gray-900">{s.name}</span>
                        {s.status === "locked" && <span className="ml-2 text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Đã khoá</span>}
                        <span className="block text-xs text-gray-500">{s.phone}</span>
                      </td>
                      {courses.map((c) => {
                        const key = `${s._id}:${c._id}`;
                        const busy = pending.has(key);
                        const on = busy ? pending.get(key) : (s.access || []).includes(c._id);
                        return (
                          <td key={c._id} className="px-4 py-2.5 text-center">
                            <Switch
                              on={on}
                              busy={busy}
                              onChange={() => flip(s, c._id, !on)}
                              label={`${s.name} vào ${c.name}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
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
                Trang {pagination.page}/{pagination.totalPages} · {pagination.total} học viên
              </span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white disabled:opacity-40">
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {dialog}
      <ToastStack toasts={toast.items} onDismiss={toast.dismiss} />
    </div>
  );
}

function Switch({ on, busy, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={on ? "Đang được vào — bấm để thôi" : "Chưa được vào — bấm để cho vào"}
      onClick={onChange}
      disabled={busy}
      className={
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
        (on ? "bg-green-500" : "bg-gray-300") +
        (busy ? " opacity-60" : "")
      }
    >
      <span className={"inline-block h-5 w-5 rounded-full bg-white shadow transition-transform " + (on ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}
