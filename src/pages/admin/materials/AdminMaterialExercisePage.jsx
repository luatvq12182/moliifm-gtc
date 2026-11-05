import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAdminExercise, useSaveExercise } from "../../../hooks/useMaterials.js";
import { useUploadImage } from "../../../hooks/useImageUpload.js";
import { resolveUploadUrl } from "../../../lib/mediaUrl.js";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";

const TYPES = {
  word_bank: { label: "Chọn từ điền vào chỗ trống", note: "Tự chấm", placeholder: "选词填空（Chọn từ điền vào chỗ trống）" },
  pinyin: { label: "Viết chữ Hán theo pinyin", note: "Tự chấm", placeholder: "根据所给的拼音写汉字（Viết chữ Hán dựa theo phiên âm cho sẵn）" },
  sentence: { label: "Đặt câu với từ cho sẵn + hình", note: "AI chấm", placeholder: "根据所给词语和图片造句（Đặt câu với từ cho sẵn và hình ảnh）" },
};
const BLANK_RE = /_{2,}/g;
const blankCount = (text) => (String(text || "").match(BLANK_RE) || []).length;
const tempKey = () => Math.random().toString(36).slice(2, 10);

const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

/**
 * Thu nhỏ ảnh trước khi tải lên (ảnh minh hoạ chụp / xuất từ Word thường vài MB,
 * học viên xem trên điện thoại chỉ cần cỡ 1200px). Ảnh đã nhỏ thì giữ nguyên.
 */
async function shrinkImage(file, maxSide = 1200) {
  if (file.size < 300 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // ảnh PNG trong suốt -> nền trắng khi đổi sang JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/** Đề từ máy chủ -> dạng để sửa (ô từ thành một chuỗi, mỗi câu có khoá riêng cho React). */
const toDraft = (sections) =>
  (sections || []).map((s) => ({
    ...s,
    _k: s.id || tempKey(),
    words: (s.words || []).join("  "),
    items: s.items.map((it) => ({ ...it, _k: it.id || tempKey() })),
  }));

const newItem = (type) =>
  type === "sentence"
    ? { _k: tempKey(), word: "", image: "", sample: "" }
    : { _k: tempKey(), text: "", answers: [], explain: "", pinyin: "" };

/**
 * Soạn bài tập của một khoá học liệu (mỗi khoá một bộ). Học viên xem đủ mọi
 * video của khoá mới làm được.
 * Lưu cả bộ một lần; lượt làm cũ của học viên giữ đề của lúc họ nộp.
 */
export default function AdminMaterialExercisePage() {
  const { courseId } = useParams();
  const { data, isLoading, isError, error } = useAdminExercise(courseId);
  // Thông báo nằm ngoài trình soạn: lưu xong trình soạn dựng lại (key đổi),
  // để bên trong thì thông báo "Đã lưu" mất theo.
  const toast = useToasts();

  return (
    <div className="pb-24">
      {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
      {isError && <p className="text-sm text-red-600">{error.message}</p>}
      {/* key theo version: lưu xong dựng lại từ dữ liệu máy chủ trả về (có id mới). */}
      {data && <Editor key={data.version} courseId={courseId} data={data} toast={toast} />}
      <ToastStack toasts={toast.items} onDismiss={toast.dismiss} />
    </div>
  );
}

function Editor({ courseId, data, toast }) {
  const [sections, setSections] = useState(() => toDraft(data.sections));
  const [dirty, setDirty] = useState(false);
  const save = useSaveExercise();
  const course = data.course;

  // Chưa lưu mà đóng tab -> trình duyệt hỏi lại.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (fn) => {
    setDirty(true);
    setSections((prev) => fn(structuredClone(prev)));
  };
  const updateSection = (si, patch) => change((list) => Object.assign(list[si], patch) && list);
  const updateItem = (si, ii, patch) => change((list) => Object.assign(list[si].items[ii], patch) && list);
  const move = (arr, i, d) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return arr;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  };

  const doSave = async () => {
    try {
      await save.mutateAsync({ courseId, sections });
      setDirty(false);
      toast.success("Đã lưu bài tập.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <Link to={`/admin/materials/videos?courseId=${course._id}`} className="text-sm text-gray-500 hover:text-gray-800">
        ← Video bài giảng của khoá
      </Link>
      <div className="mt-2 mb-5">
        <h1 className="text-xl font-heading font-semibold">Bài tập của khoá “{course.name}”</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Mỗi khoá một bộ bài tập. Học viên phải xem đủ <b>tất cả {data.videoCount} video</b> đang hiện của khoá (mỗi video 95%
          thời lượng) mới làm được. Làm lại bao nhiêu lần cũng được; nộp xong mới thấy đáp án.
          {data.attempts > 0 && ` Đã có ${data.attempts} lượt làm — sửa đề không làm thay đổi kết quả cũ.`}
        </p>
      </div>

      {sections.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-500 text-center mb-4">
          Khoá này chưa có bài tập. Thêm phần bài tập đầu tiên bên dưới.
        </div>
      )}

      <div className="space-y-4">
        {sections.map((s, si) => (
          <div key={s._k} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <p className="flex-1 font-medium text-gray-900">
                Bài {si + 1} · {TYPES[s.type].label}{" "}
                <span className={"ml-1 text-xs font-medium px-2 py-0.5 rounded-full " + (s.type === "sentence" ? "bg-violet-50 text-violet-700" : "bg-green-50 text-green-700")}>
                  {TYPES[s.type].note}
                </span>
              </p>
              <SmallBtn onClick={() => change((l) => move(l, si, -1))} disabled={si === 0} title="Lên">↑</SmallBtn>
              <SmallBtn onClick={() => change((l) => move(l, si, 1))} disabled={si === sections.length - 1} title="Xuống">↓</SmallBtn>
              <button
                type="button"
                onClick={() => window.confirm(`Xoá cả Bài ${si + 1}?`) && change((l) => l.filter((_, i) => i !== si))}
                className="text-xs px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50"
              >
                Xoá phần
              </button>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Đề bài</label>
              <input className={input} value={s.title} placeholder={TYPES[s.type].placeholder} onChange={(e) => updateSection(si, { title: e.target.value })} />
            </div>
            {s.type === "word_bank" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Các từ cho sẵn (cách nhau bằng dấu cách)</label>
                <input className={input + " text-base"} value={s.words} placeholder="中学 哪个 上学 去年 大家 家人 小学生" onChange={(e) => updateSection(si, { words: e.target.value })} />
              </div>
            )}

            <ol className="space-y-3">
              {s.items.map((it, ii) => (
                <li key={it._k} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex-1 text-xs font-medium text-gray-500">Câu {ii + 1}</span>
                    <SmallBtn onClick={() => change((l) => (move(l[si].items, ii, -1), l))} disabled={ii === 0} title="Lên">↑</SmallBtn>
                    <SmallBtn onClick={() => change((l) => (move(l[si].items, ii, 1), l))} disabled={ii === s.items.length - 1} title="Xuống">↓</SmallBtn>
                    <button
                      type="button"
                      onClick={() => change((l) => (l[si].items.splice(ii, 1), l))}
                      className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
                    >
                      Xoá
                    </button>
                  </div>
                  {s.type === "sentence" ? (
                    <SentenceItemEditor item={it} onChange={(patch) => updateItem(si, ii, patch)} />
                  ) : (
                    <BlankItemEditor type={s.type} item={it} onChange={(patch) => updateItem(si, ii, patch)} />
                  )}
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => change((l) => (l[si].items.push(newItem(s.type)), l))}
              className="text-sm font-medium text-primary-dark hover:underline"
            >
              + Thêm câu
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-white rounded-2xl border-2 border-dashed border-gray-300 p-4">
        <p className="text-sm font-medium text-gray-800 mb-2">Thêm phần bài tập</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPES).map(([type, t]) => (
            <button
              key={type}
              type="button"
              onClick={() => change((l) => [...l, { _k: tempKey(), type, title: "", words: "", items: [newItem(type)] }])}
              className="text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              + {t.label} <span className="text-xs text-gray-400">({t.note})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 flex items-center gap-3 z-30">
        <p className={"flex-1 text-sm " + (dirty ? "text-amber-700" : "text-gray-500")}>
          {dirty ? "Có thay đổi chưa lưu" : `${sections.reduce((n, s) => n + s.items.length, 0)} câu · đã lưu`}
        </p>
        <button
          type="button"
          onClick={doSave}
          disabled={save.isPending || !dirty}
          className="bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50"
        >
          {save.isPending ? "Đang lưu..." : "Lưu bài tập"}
        </button>
      </div>
    </div>
  );
}

function SmallBtn({ onClick, disabled, title, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className="w-7 h-7 rounded border border-gray-200 bg-white text-gray-500 disabled:opacity-30">
      {children}
    </button>
  );
}

function BlankItemEditor({ type, item, onChange }) {
  const n = blankCount(item.text);
  const answers = item.answers || [];
  return (
    <div className="space-y-2">
      {type === "pinyin" && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Pinyin (hiện trên chỗ trống)</label>
          <input className={input + " sm:w-60"} value={item.pinyin} placeholder="bāozi" onChange={(e) => onChange({ pinyin: e.target.value })} />
        </div>
      )}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">
          Câu — gõ <b>___</b> vào chỗ cần điền{type === "word_bank" ? "; hội thoại thì mỗi lượt một dòng (男：… / 女：…)" : ""}
        </label>
        <textarea
          className={input + " text-base"}
          rows={Math.max(1, String(item.text).split("\n").length)}
          value={item.text}
          placeholder={type === "pinyin" ? "我们早上吃___，好吗？" : "今天是星期日，我想和___一起去吃饭。"}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">
          Đáp án {n === 0 ? "— câu chưa có chỗ trống" : `(${n} chỗ trống; nhiều đáp án đúng thì ghi 有的/有些)`}
        </label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: n }, (_, i) => (
            <input
              key={i}
              className={input + " sm:w-40 text-base"}
              value={answers[i] || ""}
              placeholder={`Chỗ trống ${i + 1}`}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                onChange({ answers: next });
              }}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Lời giải — hiện sau khi nộp (câu đầy đủ, pinyin, nghĩa; mỗi ý một dòng)</label>
        <textarea className={input} rows={3} value={item.explain} onChange={(e) => onChange({ explain: e.target.value })} />
      </div>
    </div>
  );
}

function SentenceItemEditor({ item, onChange }) {
  const upload = useUploadImage();
  const [err, setErr] = useState("");
  const pick = async (file) => {
    if (!file) return;
    setErr("");
    try {
      const small = await shrinkImage(file);
      const res = await upload.mutateAsync(small);
      onChange({ image: res.url });
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <div className="grid sm:grid-cols-[160px_1fr] gap-3">
      <div>
        <div className="w-full aspect-video rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
          {item.image ? (
            <img src={resolveUploadUrl(item.image)} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] text-gray-400">Chưa có hình</span>
          )}
        </div>
        <label className="mt-1.5 inline-block text-xs border border-gray-300 rounded-lg px-2.5 py-1 bg-white hover:bg-gray-50 cursor-pointer">
          {upload.isPending ? "Đang tải lên..." : item.image ? "Đổi hình" : "Chọn hình"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {item.image && (
          <button type="button" onClick={() => onChange({ image: "" })} className="ml-2 text-xs text-red-600">
            Bỏ hình
          </button>
        )}
        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      </div>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Từ cần đặt câu</label>
          <input className={input + " sm:w-48 text-base"} value={item.word} placeholder="饺子" onChange={(e) => onChange({ word: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Câu mẫu — AI tham khảo khi chấm, học viên thấy sau khi nộp</label>
          <textarea
            className={input}
            rows={3}
            value={item.sample}
            placeholder={"我妈妈做的饺子很好吃。\nWǒ māma zuò de jiǎozi hěn hǎochī.\nSủi cảo mẹ tôi làm rất ngon."}
            onChange={(e) => onChange({ sample: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
