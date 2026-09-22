import { useState } from "react";
import {
  usePreviewImport,
  useCommitImport,
  downloadTemplate,
  saveFile,
} from "../../hooks/useStudentImport.js";

/**
 * Nhập học viên hàng loạt từ file Excel/CSV.
 *
 * BA BƯỚC, KHÔNG GỘP: chọn file -> xem trước -> tạo.
 *
 * Bước xem trước là bắt buộc chứ không phải cho đẹp. Nhập vài trăm dòng mà làm
 * một lượt thì đến dòng hỏng ở giữa là đã lỡ tạo nửa danh sách, không lùi lại
 * được. Soát sạch trước, admin gật rồi mới ghi.
 */
export default function StudentImportModal({ open, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  const preview = usePreviewImport();
  const commit = useCommitImport();

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setReport(null);
    setDone(null);
    setError("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickFile = (e) => {
    const picked = e.target.files?.[0] || null;
    setFile(picked);
    setReport(null);
    setDone(null);
    setError("");
    if (!picked) return;

    preview.mutate(picked, {
      onSuccess: setReport,
      onError: (err) => setError(err.message),
    });
  };

  const create = () => {
    setError("");
    commit.mutate(file, {
      onSuccess: (blob) => {
        const stamp = new Date().toISOString().slice(0, 10);
        saveFile(blob, `tai-khoan-hoc-vien-${stamp}.xlsx`);
        setDone({ count: report.summary.ready });
        onDone?.();
      },
      onError: (err) => setError(err.message),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-heading font-semibold mb-1">
            Nhập học viên từ file
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            File Excel (.xlsx) hoặc CSV, tối đa 500 dòng mỗi lần.
          </p>

          {done ? (
            <DoneNotice count={done.count} onAgain={reset} onClose={close} />
          ) : (
            <>
              <button
                type="button"
                onClick={() => downloadTemplate().catch((e) => setError(e.message))}
                className="text-sm text-primary-dark underline mb-4"
              >
                Tải file mẫu
              </button>

              <div className="mb-4">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={pickFile}
                  disabled={commit.isPending}
                  className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-gray-900 file:font-medium hover:file:bg-primary-dark disabled:opacity-60"
                />
              </div>

              {preview.isPending && (
                <p className="text-sm text-gray-500">Đang đọc file...</p>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  {error}
                </p>
              )}

              {report && <Report report={report} />}

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={create}
                  disabled={!report || report.summary.ready === 0 || commit.isPending}
                  className="px-5 py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900 disabled:opacity-50"
                >
                  {commit.isPending
                    ? "Đang tạo tài khoản..."
                    : report
                      ? `Tạo ${report.summary.ready} tài khoản`
                      : "Tạo tài khoản"}
                </button>
                <button
                  type="button"
                  onClick={close}
                  disabled={commit.isPending}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Đóng
                </button>
              </div>

              {commit.isPending && (
                <p className="text-xs text-gray-500 mt-2">
                  Mỗi mật khẩu cần một chút thời gian để mã hoá an toàn, nên vài
                  trăm học viên có thể mất khoảng nửa phút. Đừng đóng cửa sổ này.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Report({ report }) {
  const { summary, problems, sample, headerRow } = report;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Dòng trong file" value={summary.total} />
        <Stat label="Tạo được" value={summary.ready} tone="good" />
        <Stat
          label="Bỏ qua"
          value={summary.problems}
          tone={summary.problems > 0 ? "warn" : undefined}
        />
      </div>

      <p className="text-xs text-gray-500">
        Nhận ra hàng tiêu đề ở dòng {headerRow}.
      </p>

      {sample.length > 0 && (
        <div>
          <p className="text-[11px] font-medium tracking-wide text-gray-500 mb-1.5">
            KIỂM LẠI VÀI DÒNG ĐẦU — CỘT ĐÃ ĐÚNG CHƯA?
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-2.5 py-1.5">Họ tên</th>
                  <th className="text-left px-2.5 py-1.5">Số điện thoại</th>
                  <th className="text-left px-2.5 py-1.5">Email</th>
                </tr>
              </thead>
              <tbody>
                {sample.map((s) => (
                  <tr key={s.rowNumber} className="border-t border-gray-100">
                    <td className="px-2.5 py-1.5">{s.name}</td>
                    <td className="px-2.5 py-1.5 text-gray-700">{s.phone}</td>
                    <td className="px-2.5 py-1.5 text-gray-600">
                      {s.email || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {problems.length > 0 && (
        <div>
          <p className="text-[11px] font-medium tracking-wide text-amber-700 mb-1.5">
            {problems.length} DÒNG SẼ BỊ BỎ QUA
          </p>
          <div className="border border-amber-200 bg-amber-50/50 rounded-lg max-h-44 overflow-y-auto">
            {problems.map((p, i) => (
              <div
                key={i}
                className="px-2.5 py-1.5 text-xs border-b border-amber-100 last:border-0"
              >
                <span className="text-gray-500">Dòng {p.rowNumber}</span>
                {p.name && <span className="ml-2">{p.name}</span>}
                {p.phone && (
                  <span className="ml-2 text-gray-500">{p.phone}</span>
                )}
                <span className="ml-2 text-amber-800">— {p.reason}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Sửa trong file rồi chọn lại, hoặc cứ tạo phần còn lại — các dòng này
            vẫn được liệt kê trong file kết quả.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const color =
    tone === "good"
      ? "text-green-700 bg-green-50 border-green-200"
      : tone === "warn"
        ? "text-amber-800 bg-amber-50 border-amber-200"
        : "text-gray-700 bg-gray-50 border-gray-200";
  return (
    <div className={"rounded-lg border py-2 " + color}>
      <p className="text-xl font-semibold leading-none">{value}</p>
      <p className="text-[11px] mt-1">{label}</p>
    </div>
  );
}

function DoneNotice({ count, onAgain, onClose }) {
  return (
    <div>
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-4">
        <p className="text-sm text-green-800 font-medium mb-1">
          Đã tạo {count} tài khoản. File mật khẩu vừa được tải về máy bạn.
        </p>
        <p className="text-xs text-green-800">
          Hệ thống <strong>không lưu lại</strong> mật khẩu ở dạng đọc được, nên
          đây là bản duy nhất. Hãy cất file vào nơi an toàn trước khi phát cho
          học viên. Nếu lỡ mất, dùng chức năng đặt lại mật khẩu cho từng học
          viên.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAgain}
          className="px-5 py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
        >
          Nhập file khác
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
