import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader.jsx";
import { resolveUploadUrl } from "../../lib/mediaUrl.js";
import { useMyExercise, useRegradeAttempt, useSubmitExercise } from "../../hooks/useMaterials.js";

const BLANK_RE = /_{2,}/;

/**
 * Học liệu khoá học — bài tập của khoá (mỗi khoá một bộ). Chỉ mở khi đã xem đủ
 * TẤT CẢ video của khoá (máy chủ chặn, trang chỉ hiện lời nhắn).
 *
 * Ba dạng: chọn từ điền vào chỗ trống, viết chữ Hán theo pinyin (chấm tự
 * động), đặt câu với từ cho sẵn + hình (AI chấm). Nộp xong hiện đáp án, lời
 * giải, nhận xét; làm lại bao nhiêu lần cũng được.
 */
export default function MaterialExercisePage() {
  const { courseSlug } = useParams();
  const { data, isLoading, isError, error } = useMyExercise(courseSlug);
  const submit = useSubmitExercise(courseSlug);
  const [answers, setAnswers] = useState({});
  const [retaking, setRetaking] = useState(false);
  const [warnMissing, setWarnMissing] = useState(false);
  // "Quay lại" về danh sách video của khoá.
  const videoPath = `/hoc-lieu/${courseSlug}?tab=video`;

  const result = submit.data && !retaking ? submit.data : !retaking ? data?.lastAttempt : null;

  const missing = (data?.sections || []).reduce(
    (n, s) =>
      n +
      s.items.reduce((m, it) => {
        if (s.type === "sentence") return m + (String(answers[it.id] || "").trim() ? 0 : 1);
        const a = answers[it.id] || [];
        return m + Array.from({ length: it.blanks }, (_, i) => (String(a[i] || "").trim() ? 0 : 1)).reduce((x, y) => x + y, 0);
      }, 0),
    0,
  );

  const doSubmit = () => {
    if (missing > 0 && !warnMissing) {
      setWarnMissing(true);
      return;
    }
    setWarnMissing(false);
    submit.mutate(answers, {
      onSuccess: () => {
        setRetaking(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    });
  };

  const retake = () => {
    setAnswers({});
    setRetaking(true);
    submit.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader backTo={videoPath} backLabel="Danh sách video" title={data?.course?.name ? `Bài tập · ${data.course.name}` : "Bài tập"} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
        {isError && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-700">{error.message}</p>
            <Link to={videoPath} className="inline-block mt-4 bg-primary hover:bg-primary-dark text-gray-900 font-medium px-5 py-2 rounded-full">
              {error.code === "VIDEO_NOT_WATCHED" ? "Xem tiếp các video" : "Quay lại khoá học"}
            </Link>
          </div>
        )}

        {data && (
          <>
            <h2 className="text-xl font-bold text-gray-900">Bài tập ứng dụng</h2>
            <p className="text-sm text-gray-500 mt-0.5">{data.course.name}</p>

            {result ? (
              <ResultView attempt={result} onRetake={retake} videoPath={videoPath} />
            ) : (
              <>
                <div className="space-y-5 mt-5">
                  {data.sections.map((s, i) => (
                    <SectionForm
                      key={s.id}
                      index={i}
                      section={s}
                      answers={answers}
                      setAnswer={(id, value) => {
                        setWarnMissing(false);
                        setAnswers((prev) => ({ ...prev, [id]: value }));
                      }}
                    />
                  ))}
                </div>

                <div className="sticky bottom-0 mt-6 -mx-4 px-4 py-3 bg-white/95 backdrop-blur border-t border-orange-100 flex flex-col sm:flex-row sm:items-center gap-2">
                  <p className={"flex-1 text-sm " + (warnMissing ? "text-red-600 font-medium" : "text-gray-500")}>
                    {submit.isPending
                      ? "Đang chấm bài… phần đặt câu do AI chấm, có thể mất vài chục giây."
                      : submit.isError
                        ? submit.error.message
                        : warnMissing
                          ? `Còn ${missing} chỗ chưa làm. Bấm “Nộp bài” lần nữa nếu vẫn muốn nộp.`
                          : missing > 0
                            ? `Còn ${missing} chỗ chưa làm`
                            : "Đã làm hết, nộp bài thôi!"}
                  </p>
                  <div className="flex gap-2">
                    {retaking && data.lastAttempt && (
                      <button type="button" onClick={() => setRetaking(false)} className="px-4 py-2.5 rounded-full border border-gray-300 text-sm text-gray-600 bg-white">
                        Xem kết quả cũ
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={doSubmit}
                      disabled={submit.isPending}
                      className="flex-1 sm:flex-none bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium px-6 py-2.5 rounded-full disabled:opacity-60"
                    >
                      {submit.isPending ? "Đang chấm..." : "Nộp bài"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SectionHeader({ index, title }) {
  return (
    <h3 className="font-heading font-semibold text-gray-900">
      Bài {index + 1}. <span className="font-normal">{title}</span>
    </h3>
  );
}

function SectionForm({ index, section, answers, setAnswer }) {
  return (
    <section className="bg-white rounded-2xl border border-orange-200 p-4 sm:p-5">
      <SectionHeader index={index} title={section.title} />

      {section.type === "word_bank" && (
        <>
          <div className="flex flex-wrap gap-2 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
            {section.words.map((w) => (
              <span key={w} className="px-3 py-1 rounded-full bg-white border border-amber-200 text-lg font-medium text-gray-900">
                {w}
              </span>
            ))}
          </div>
          <ol className="mt-3 space-y-3">
            {section.items.map((it, i) => (
              <li key={it.id} className="flex gap-2 text-lg leading-[2.6rem]">
                <span className="text-sm text-gray-400 leading-[2.6rem] w-5 shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <BlankText
                    text={it.text}
                    render={(bi) => (
                      <select
                        value={(answers[it.id] || [])[bi] || ""}
                        onChange={(e) => {
                          const next = [...(answers[it.id] || [])];
                          next[bi] = e.target.value;
                          setAnswer(it.id, next);
                        }}
                        aria-label={`Câu ${i + 1}, chỗ trống ${bi + 1}`}
                        className="mx-1 align-middle border-b-2 border-orange-300 bg-orange-50/60 rounded-md px-2 py-0.5 text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">—— chọn ——</option>
                        {section.words.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {section.type === "pinyin" && (
        <ol className="mt-3 space-y-3">
          {section.items.map((it, i) => (
            <li key={it.id} className="flex gap-2 text-lg leading-[3.2rem]">
              <span className="text-sm text-gray-400 leading-[3.2rem] w-5 shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <BlankText
                  text={it.text}
                  render={(bi) => (
                    <span className="inline-flex flex-col items-center align-middle mx-1">
                      <span className="text-xs leading-4 text-orange-700 font-medium">{it.pinyin}</span>
                      <input
                        value={(answers[it.id] || [])[bi] || ""}
                        onChange={(e) => {
                          const next = [...(answers[it.id] || [])];
                          next[bi] = e.target.value;
                          setAnswer(it.id, next);
                        }}
                        aria-label={`Câu ${i + 1}: viết chữ Hán cho "${it.pinyin}"`}
                        lang="zh"
                        className="w-28 text-center border-b-2 border-orange-300 bg-orange-50/60 rounded-md px-2 py-0.5 text-lg leading-7 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </span>
                  )}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      {section.type === "sentence" && (
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {section.items.map((it, i) => (
            <div key={it.id} className="rounded-xl border border-gray-200 overflow-hidden">
              {it.image && (
                <img src={resolveUploadUrl(it.image)} alt={it.word} loading="lazy" className="w-full aspect-video object-cover bg-gray-100" />
              )}
              <div className="p-3">
                <p className="text-sm text-gray-500">
                  {i + 1}. Đặt câu với từ: <span className="text-2xl font-bold text-gray-900 align-middle ml-1">{it.word}</span>
                </p>
                <textarea
                  value={answers[it.id] || ""}
                  onChange={(e) => setAnswer(it.id, e.target.value)}
                  rows={2}
                  lang="zh"
                  placeholder="Viết câu bằng chữ Hán…"
                  className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Câu có chỗ trống "____" (nhiều dòng được — hội thoại): chèn ô nhập vào từng chỗ. */
function BlankText({ text, render }) {
  let blank = 0;
  return String(text)
    .split("\n")
    .map((line, li) => (
      <div key={li}>
        {line.split(BLANK_RE).map((part, pi, arr) => (
          <span key={pi}>
            {part}
            {pi < arr.length - 1 && render(blank++)}
          </span>
        ))}
      </div>
    ));
}

const VERDICT = {
  dat: { label: "Đạt", cls: "bg-green-100 text-green-800" },
  gan_dat: { label: "Gần đạt", cls: "bg-amber-100 text-amber-800" },
  chua_dat: { label: "Chưa đạt", cls: "bg-red-100 text-red-700" },
};

function ResultView({ attempt, onRetake, videoPath }) {
  const regrade = useRegradeAttempt();
  const a = regrade.data || attempt;
  const ai = a.ai || {};
  const hasSentences = (a.sections || []).some((s) => s.type === "sentence");

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-2xl bg-white border border-orange-200 p-4 sm:p-5">
        <p className="text-sm text-gray-500">Kết quả bài làm</p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 mt-1">
          {a.autoTotal > 0 && (
            <p className="text-gray-900">
              Điền từ / viết chữ: <span className="text-2xl font-bold text-orange-600">{a.autoCorrect}</span>
              <span className="text-gray-500">/{a.autoTotal} đúng</span>
            </p>
          )}
          {hasSentences && ai.status === "done" && (
            <p className="text-gray-900">
              Đặt câu (AI chấm): <span className="text-2xl font-bold text-orange-600">{ai.passed}</span>
              <span className="text-gray-500">/{ai.total} đạt</span>
            </p>
          )}
        </div>
        {hasSentences && ai.status !== "done" && (
          <div className="mt-3 text-sm rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-amber-900">
            {ai.status === "unavailable" && "Phần đặt câu chưa được chấm tự động — bạn so với câu mẫu bên dưới nhé."}
            {ai.status === "error" && "Chưa chấm được phần đặt câu (lỗi kết nối tới AI). "}
            {ai.status === "limited" && "Hôm nay bạn đã dùng hết lượt AI chấm. Bạn so với câu mẫu bên dưới, hoặc chấm lại sau. "}
            {(ai.status === "error" || ai.status === "limited") && (
              <button type="button" onClick={() => regrade.mutate(a._id)} disabled={regrade.isPending} className="underline font-medium">
                {regrade.isPending ? "Đang chấm lại..." : "Chấm lại phần đặt câu"}
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" onClick={onRetake} className="bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium px-5 py-2 rounded-full">
            Làm lại
          </button>
          <Link to={videoPath} className="px-5 py-2 rounded-full border border-gray-300 text-gray-700 bg-white">
            Xem lại các video
          </Link>
        </div>
      </div>

      {(a.sections || []).map((s, i) => (
        <section key={s.id} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
          <SectionHeader index={i} title={s.title} />
          <ol className="mt-3 space-y-4">
            {s.items.map((it, ii) =>
              s.type === "sentence" ? (
                <SentenceResult key={it.id} n={ii + 1} item={it} answer={a.answers?.[it.id]} result={a.results?.[it.id]} aiDone={ai.status === "done"} />
              ) : (
                <BlankResult key={it.id} item={it} given={a.answers?.[it.id] || []} correct={a.results?.[it.id]?.correct || []} />
              ),
            )}
          </ol>
        </section>
      ))}
    </div>
  );
}

function BlankResult({ item, given, correct }) {
  const allRight = correct.length > 0 && correct.every(Boolean);
  return (
    <li className="flex gap-2">
      <span className={"text-sm w-5 shrink-0 mt-1.5 " + (allRight ? "text-green-600" : "text-red-500")}>{allRight ? "✓" : "✗"}</span>
      <div className="flex-1 min-w-0">
        <div className="text-lg leading-9">
          <BlankText
            text={item.text}
            render={(bi) =>
              correct[bi] ? (
                <span className="mx-1 px-1.5 rounded bg-green-100 text-green-800 font-medium">{given[bi]}</span>
              ) : (
                <span className="mx-1">
                  <span className="px-1.5 rounded bg-red-100 text-red-700 line-through">{given[bi] || "(trống)"}</span>
                  <span className="ml-1 px-1.5 rounded bg-green-100 text-green-800 font-medium">{String(item.answers[bi]).split("/")[0]}</span>
                </span>
              )
            }
          />
        </div>
        {item.explain && <p className="mt-1 text-sm text-gray-600 whitespace-pre-line bg-gray-50 rounded-lg px-3 py-2">{item.explain}</p>}
      </div>
    </li>
  );
}

function SentenceResult({ n, item, answer, result, aiDone }) {
  const v = aiDone && result ? VERDICT[result.verdict] : null;
  return (
    <li className="rounded-xl border border-gray-200 p-3 flex gap-3">
      {item.image && (
        <img src={resolveUploadUrl(item.image)} alt={item.word} loading="lazy" className="hidden sm:block w-32 h-20 rounded-lg object-cover shrink-0" />
      )}
      <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">{n}. Từ:</span>
        <span className="text-xl font-bold text-gray-900">{item.word}</span>
        {v && <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + v.cls}>{v.label}</span>}
      </div>
      <p className="mt-2 text-lg text-gray-900">
        <span className="text-sm text-gray-500 mr-1">Câu của bạn:</span>
        {answer || <span className="text-gray-400 text-base">(chưa viết)</span>}
      </p>
      {v && result.comment && <p className="mt-1 text-sm text-gray-700">💬 {result.comment}</p>}
      {v && result.corrected && result.corrected !== answer && (
        <p className="mt-1 text-base text-green-800">
          <span className="text-sm text-gray-500 mr-1">Gợi ý sửa:</span>
          {result.corrected}
        </p>
      )}
      {item.sample && (
        <p className="mt-2 text-sm text-gray-600 whitespace-pre-line bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium text-gray-700">Câu mẫu: </span>
          {item.sample}
        </p>
      )}
      </div>
    </li>
  );
}
