import { useState } from "react";
import {
  useAdminExercise,
  useAdminMaterialCourses,
  useAiGrading,
  useSaveAiGrading,
  useTestAiGrading,
} from "../../../hooks/useMaterials.js";
import { resolveUploadUrl } from "../../../lib/mediaUrl.js";
import { useConfirm } from "../../../components/admin/ConfirmDialog.jsx";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";

const VERDICT = {
  dat: { label: "Đạt", cls: "bg-green-100 text-green-800" },
  gan_dat: { label: "Gần đạt", cls: "bg-amber-100 text-amber-800" },
  chua_dat: { label: "Chưa đạt", cls: "bg-red-100 text-red-700" },
};
const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const emptyRow = () => ({ key: Math.random().toString(36).slice(2), word: "", sample: "", image: "", answer: "" });

/**
 * Cấu hình AI chấm phần "Đặt câu với từ cho sẵn (+ hình)": sửa hướng dẫn chấm
 * trên web, chấm thử trước khi lưu. Phần kỹ thuật (định dạng kết quả, chống
 * câu "dụ" AI) máy chủ tự thêm, không sửa ở đây.
 */
export default function AdminAiGradingPage() {
  const { data, isLoading, isError, error } = useAiGrading();
  const toast = useToasts();
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-heading font-semibold">Cấu hình AI chấm</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Hướng dẫn AI dùng để chấm phần <b>Đặt câu với từ cho sẵn (+ hình)</b> trong bài tập. Sửa xong nên bấm “Chấm thử” với vài câu
          trước khi lưu.
        </p>
      </div>
      {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
      {isError && <p className="text-sm text-red-600">{error.message}</p>}
      {/* key: lưu xong dựng lại bản nháp từ dữ liệu mới. */}
      {data && <Editor key={`${data.updatedAt}-${data.isDefault}-${data.model}`} data={data} toast={toast} />}
      <ToastStack toasts={toast.items} onDismiss={toast.dismiss} />
    </div>
  );
}

function Editor({ data, toast }) {
  const [draft, setDraft] = useState(data.rubric);
  const [model, setModel] = useState(data.model);
  const save = useSaveAiGrading();
  const { confirm, dialog } = useConfirm();
  const dirty = draft !== data.rubric || model !== data.model;

  const doSave = async () => {
    try {
      await save.mutateAsync({ rubric: draft, model: model.trim() });
      toast.success("Đã lưu. Các bài nộp từ giờ sẽ chấm theo cấu hình này.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const restore = async () => {
    if (
      !(await confirm({
        title: "Khôi phục bản mặc định?",
        message: "Ô soạn thảo sẽ được thay bằng hướng dẫn mặc định của hệ thống. Bấm “Lưu” để áp dụng.",
        confirmLabel: "Khôi phục",
      }))
    )
      return;
    setDraft(data.defaultRubric);
  };

  return (
    <div className="grid xl:grid-cols-2 gap-4 items-start">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <ModelPicker data={data} value={model} onChange={setModel} />

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <p>
            <span className="text-gray-500">Khoá API:</span>{" "}
            {data.configured ? (
              <span className="font-medium text-green-700">✓ đã cài</span>
            ) : (
              <span className="font-medium text-red-600">chưa cài — thêm ANTHROPIC_API_KEY vào .env của API</span>
            )}
          </p>
          <p>
            <span className="text-gray-500">Đang dùng:</span>{" "}
            <span className="font-medium">
              {data.isDefault ? "bản mặc định" : `bản đã sửa (${new Date(data.updatedAt).toLocaleString("vi-VN")})`}
            </span>
          </p>
        </div>

        <div>
          <div className="flex items-end justify-between mb-1">
            <label className="text-xs text-gray-500">Hướng dẫn chấm</label>
            <span className={"text-[11px] " + (draft.length > data.maxLength ? "text-red-600" : "text-gray-400")}>
              {draft.length}/{data.maxLength}
            </span>
          </div>
          <textarea className={input + " leading-relaxed"} rows={26} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <p className="text-[11px] text-gray-400 mt-1">
            Ba mức chấm phải giữ đúng tên: <b>dat</b> (Đạt), <b>gan_dat</b> (Gần đạt), <b>chua_dat</b> (Chưa đạt). Định dạng kết quả và
            quy tắc chống câu “dụ” AI do hệ thống tự thêm, không cần viết ở đây.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={doSave}
            disabled={!dirty || save.isPending || draft.length > data.maxLength}
            className="bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {save.isPending ? "Đang lưu..." : "Lưu"}
          </button>
          {dirty && (
            <button
              type="button"
              onClick={() => {
                setDraft(data.rubric);
                setModel(data.model);
              }}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Bỏ thay đổi
            </button>
          )}
          {draft !== data.defaultRubric && (
            <button type="button" onClick={restore} className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
              Khôi phục bản mặc định
            </button>
          )}
        </div>
      </div>

      <TestPanel rubric={draft} model={model.trim()} configured={data.configured} dirty={dirty} />
      {dialog}
    </div>
  );
}

/**
 * Chọn model chấm: danh sách gợi ý, hoặc nhập mã khác (model mới ra sau này).
 * Để trùng model mặc định = không ghi đè (theo .env / mặc định hệ thống).
 */
function ModelPicker({ data, value, onChange }) {
  const known = data.modelOptions.some((o) => o.id === value);
  const [custom, setCustom] = useState(!known);
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">Model chấm</label>
      <div className="flex flex-col gap-2">
        <select
          value={custom ? "__custom" : value}
          onChange={(e) => {
            if (e.target.value === "__custom") {
              setCustom(true);
              return;
            }
            setCustom(false);
            onChange(e.target.value);
          }}
          className={input}
        >
          {data.modelOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label} — {o.note}
              {o.id === data.defaultModel ? " (mặc định)" : ""}
            </option>
          ))}
          <option value="__custom">Khác — nhập mã model…</option>
        </select>
        {custom && (
          <input className={input + " font-mono"} value={value} placeholder="claude-…" onChange={(e) => onChange(e.target.value)} />
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        Đổi model rồi bấm “Chấm thử” để so sánh trước khi lưu. Model mạnh hơn chấm kỹ hơn nhưng tốn phí hơn mỗi lần nộp bài.
      </p>
    </div>
  );
}

/** Chấm thử bằng hướng dẫn + model đang chọn — lấy câu (từ, hình, câu mẫu) từ bài tập của một khoá, hoặc tự nhập. */
function TestPanel({ rubric, model, configured, dirty }) {
  const { data: courses = [] } = useAdminMaterialCourses();
  const withExercise = courses.filter((c) => c.exerciseCount > 0);
  const [courseId, setCourseId] = useState("");
  const { data: exercise } = useAdminExercise(courseId);
  const [rows, setRows] = useState(() => [emptyRow()]);
  const test = useTestAiGrading();
  // Kết quả gắn theo từng dòng (máy chủ bỏ qua dòng chưa có từ -> không khớp theo thứ tự được).
  const [resultOf, setResultOf] = useState({});
  const runTest = () => {
    const sent = rows.filter((r) => r.word.trim());
    test.mutate(
      { rubric, model, items: sent.map(({ word, sample, image, answer }) => ({ word, sample, image, answer })) },
      { onSuccess: (d) => setResultOf(Object.fromEntries(sent.map((r, j) => [r.key, d.items[j]]))) },
    );
  };

  const sentenceItems = (exercise?.sections || []).filter((s) => s.type === "sentence").flatMap((s) => s.items);
  const loadFromCourse = () =>
    setRows(sentenceItems.map((it) => ({ ...emptyRow(), word: it.word, sample: it.sample, image: it.image })));
  const update = (i, patch) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div>
        <p className="font-medium text-gray-900">Chấm thử</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Chấm bằng hướng dẫn và model <b>{dirty ? "đang chọn (chưa lưu)" : "đang dùng"}</b> — <span className="font-mono">{model}</span>. Mỗi
          lần bấm là một lượt gọi AI thật (tính phí).
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={input + " sm:w-60"}>
          <option value="">Lấy câu từ bài tập của khoá…</option>
          {withExercise.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadFromCourse}
          disabled={!sentenceItems.length}
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
        >
          {courseId && !sentenceItems.length ? "Khoá này không có phần đặt câu" : `Lấy ${sentenceItems.length || ""} câu (kèm hình)`}
        </button>
      </div>

      <ol className="space-y-3">
        {rows.map((r, i) => {
          const res = resultOf[r.key];
          const v = res && VERDICT[res.verdict];
          return (
            <li key={r.key} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
              <div className="flex gap-3">
                {r.image && <img src={resolveUploadUrl(r.image)} alt="" className="w-24 h-16 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0 grid sm:grid-cols-[110px_1fr] gap-2 content-start">
                  <input className={input + " text-base"} value={r.word} placeholder="Từ" onChange={(e) => update(i, { word: e.target.value })} />
                  <input className={input} value={r.sample.split("\n")[0]} placeholder="Câu mẫu (không bắt buộc)" onChange={(e) => update(i, { sample: e.target.value })} />
                </div>
                <button
                  type="button"
                  onClick={() => setRows((list) => list.filter((_, j) => j !== i))}
                  className="text-xs text-red-600 self-start px-1"
                  title="Bỏ câu này"
                >
                  ✕
                </button>
              </div>
              <input
                className={input + " text-base"}
                value={r.answer}
                lang="zh"
                placeholder="Câu học viên viết (để thử)…"
                onChange={(e) => update(i, { answer: e.target.value })}
              />
              {res && res.answer === r.answer.trim() && (
                <div className="text-sm bg-white rounded-lg border border-gray-200 px-3 py-2">
                  {v && <span className={"text-xs font-medium px-2 py-0.5 rounded-full mr-2 " + v.cls}>{v.label}</span>}
                  <span className="text-gray-700">{res.comment}</span>
                  {res.corrected && res.corrected !== res.answer && <p className="mt-1 text-green-800">Gợi ý sửa: {res.corrected}</p>}
                  {res.model && <p className="mt-1 text-[11px] text-gray-400">chấm bằng {res.model}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRows((list) => [...list, emptyRow()])} className="text-sm font-medium text-primary-dark hover:underline">
          + Thêm câu
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={runTest}
          disabled={!configured || test.isPending || !rows.some((r) => r.word.trim())}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {test.isPending ? "AI đang chấm..." : "Chấm thử"}
        </button>
      </div>
      {test.isError && <p className="text-sm text-red-600">{test.error.message}</p>}
    </div>
  );
}
