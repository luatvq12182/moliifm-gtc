import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader.jsx";
import { useMyExamTest, useStartExamAttempt } from "../../hooks/useExam.js";
import { isValidPhone } from "../../lib/phone.js";

/**
 * Luyện thi HSK 3.0 — giới thiệu một đề + điền thông tin thí sinh trước khi
 * vào thi (khách chốt: tên, SĐT, mã lớp; điền xong mới vào thi, không tính giờ).
 */
export default function ExamTestIntroPage() {
  const { levelSlug, testId } = useParams();
  const { data: test, isLoading, isError, error } = useMyExamTest(testId);
  const backTo = `/luyen-thi/${levelSlug}?muc=luyen-de`;

  return (
    <div className="min-h-screen">
      <SiteHeader backTo={backTo} backLabel="Danh sách đề" title={test ? test.title : "Luyện đề"} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
        {isError && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-700">{error.message}</p>
            <Link to={backTo} className="inline-block mt-3 text-sm text-primary-dark underline">
              Quay lại danh sách đề
            </Link>
          </div>
        )}
        {test && <Intro key={test._id} test={test} levelSlug={levelSlug} />}
      </main>
    </div>
  );
}

function Intro({ test, levelSlug }) {
  const navigate = useNavigate();
  const start = useStartExamAttempt(test._id);
  const [form, setForm] = useState({ name: test.candidate.name, phone: test.candidate.phone, classCode: "" });
  const [err, setErr] = useState("");
  const total = test.sections.reduce((n, s) => n + s.durationSec, 0);
  const listening = test.sections.find((s) => s.id === "listening");
  const review = test.sections.find((s) => s.id === "review");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim()) return setErr("Vui lòng nhập họ tên.");
    if (!isValidPhone(form.phone)) return setErr("Số điện thoại không hợp lệ.");
    try {
      const res = await start.mutateAsync({ name: form.name.trim(), phone: form.phone, classCode: form.classCode.trim() });
      navigate(`/luyen-thi/${levelSlug}/lam-bai/${res._id}`);
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <>
      <h2 className="text-xl font-bold">{test.title}</h2>
      <p className="text-sm text-gray-500 mt-1">
        {test.level.name} · {test.questionCount} câu · khoảng {Math.round(total / 60)} phút
        {test.submittedCount > 0 && ` · bạn đã làm ${test.submittedCount} lần`}
      </p>

      <div className="mt-4 bg-white rounded-2xl border border-orange-200 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {test.sections.map((s) => (
              <tr key={s.id} className="border-b border-orange-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-800">{s.label}</td>
                <td className="px-4 py-2.5 text-gray-500">{s.questionCount ? `${s.questionCount} câu` : "—"}</td>
                <td className="px-4 py-2.5 text-right text-gray-800">{Math.round(s.durationSec / 60) || "<1"} phút</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 text-sm text-gray-700 space-y-1.5 list-disc pl-5">
        {listening && <li>Phần nghe phát file nghe <b>một lần duy nhất</b>, không dừng, không tua, không nghe lại.</li>}
        {review && <li>Hết phần nghe có {Math.round(review.durationSec / 60)} phút xem lại và sửa đáp án phần nghe (không có tiếng).</li>}
        <li>Hết giờ phần nào thì tự chuyển sang phần sau; hết giờ phần cuối thì tự nộp bài.</li>
        <li>Làm xong phần đọc, phần viết sớm thì có thể nộp sớm.</li>
        <li>Đáp án được lưu tự động. Lỡ đóng trang thì mở lại làm tiếp — nhưng <b>giờ vẫn chạy</b> trong lúc bạn rời đi.</li>
        <li>Nên dùng máy tính và tai nghe để làm bài như thi thật.</li>
      </ul>

      {test.history?.length > 0 && (
        <div className="mt-5">
          <p className="font-medium text-gray-900 mb-2">Các lần đã làm</p>
          <ul className="bg-white rounded-2xl border border-orange-200 divide-y divide-orange-50">
            {test.history.map((h) => (
              <li key={h._id}>
                <Link to={`/luyen-thi/${levelSlug}/lam-bai/${h._id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/50">
                  <span className="text-sm text-gray-600 flex-1">
                    {new Date(h.submittedAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                  {h.total == null ? (
                    <span className="text-sm text-gray-400">Đang chấm…</span>
                  ) : (
                    <span className={"text-sm font-semibold " + (h.passed ? "text-green-700" : "text-gray-800")}>
                      {h.total}/{h.max}
                      {h.passed && " · Đạt"}
                      {h.aiStatus === "pending" && " (tạm)"}
                    </span>
                  )}
                  <span className="text-sm text-primary-dark">Xem kết quả →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {test.inProgressId ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">Bạn đang làm dở đề này — giờ vẫn đang chạy.</p>
          <Link
            to={`/luyen-thi/${levelSlug}/lam-bai/${test.inProgressId}`}
            className="inline-block mt-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium px-5 py-2.5 rounded-full"
          >
            Làm tiếp →
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 bg-white rounded-2xl border border-orange-200 p-4 space-y-3">
          <p className="font-medium text-gray-900">Thông tin thí sinh</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Họ và tên *</label>
              <input className={input} value={form.name} onChange={set("name")} autoComplete="name" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Số điện thoại *</label>
              <input className={input} value={form.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Mã lớp (nếu có)</label>
              <input className={input} value={form.classCode} onChange={set("classCode")} placeholder="VD: HSK3-K12" />
            </div>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={start.isPending}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium px-6 py-3 rounded-full disabled:opacity-60"
          >
            {start.isPending ? "Đang vào thi..." : "Bắt đầu làm bài — tính giờ ngay"}
          </button>
        </form>
      )}
    </>
  );
}
