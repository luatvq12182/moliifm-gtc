import { useMemo, useState } from "react";
import RecordingPlayer from "./RecordingPlayer.jsx";
import {
  CheckIcon,
  CrossIcon,
  ExerciseIcon,
  MicIcon,
  VideoIcon,
} from "./icons.jsx";

/**
 * Nội dung chi tiết một lượt hoàn thành bài học — màn đối chiếu của giáo viên.
 *
 * `recordingPath` do nơi gọi truyền vào (route nghe bản ghi của admin khác
 * route của học viên).
 *
 * VIDEO LÀ CẤP LỚN NHẤT: mỗi video gồm Bài tập và Luyện nói của riêng nó —
 * đúng như học viên học (mỗi video là một mạch 4 bước độc lập). Bài nhiều
 * video (đa phần HSK2) hiện thanh tab chọn video, mỗi tab kèm điểm tóm tắt
 * để giáo viên thấy ngay video nào kém mà chưa cần mở.
 *
 * Điểm tổng của cả bài đã nằm trên dòng tiêu đề của lượt học (LessonHistoryModal),
 * nên ở đây chỉ còn một dòng tóm tắt, không lặp lại thẻ điểm to.
 */

/**
 * Các lượt đọc của một câu, cũ trước mới sau.
 *
 * Bản ghi tạo bởi bản đầu của tính năng không có `attempts` — khi đó dựng
 * tạm MỘT lượt từ điểm ở cấp câu, để lịch sử cũ vẫn hiện được nút nghe lại.
 */
function readingsOf(line) {
  if (Array.isArray(line.attempts) && line.attempts.length > 0) return line.attempts;
  if (!line.attemptId) return [];
  return [{ attemptId: line.attemptId, score: line.score, at: null }];
}

/** Màu theo điểm: xanh ≥ 80, vàng ≥ 60, đỏ dưới 60, xám khi không có điểm. */
const toneOf = (v) =>
  v === null || v === undefined
    ? { text: "text-gray-400", soft: "bg-gray-100", ring: "ring-gray-200" }
    : v >= 80
      ? { text: "text-green-700", soft: "bg-green-50", ring: "ring-green-200" }
      : v >= 60
        ? { text: "text-amber-700", soft: "bg-amber-50", ring: "ring-amber-200" }
        : { text: "text-red-600", soft: "bg-red-50", ring: "ring-red-200" };

/** Điểm trung bình phát âm của một video — từ điểm lượt đọc cuối từng câu. */
function speakingAvgOf(video) {
  const scores = (video.speaking?.lines || []).map((l) => l.score).filter((n) => typeof n === "number");
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

export default function AttemptDetail({ attempt, recordingPath }) {
  const videos = useMemo(() => attempt?.videos || [], [attempt]);
  const [active, setActive] = useState(0);

  const allLines = useMemo(() => videos.flatMap((v) => v.speaking?.lines || []), [videos]);
  // TỔNG LƯỢT ĐỌC TÍNH TỪ CHÍNH DANH SÁCH ĐANG HIỆN, không lấy
  // `speaking.totalReadings` của máy chủ: với bản ghi cũ hai nguồn lệch nhau,
  // và không bao giờ hiện một con số mà mình không chỉ ra được nó gồm gì.
  const totalReadings = useMemo(
    () => allLines.reduce((sum, l) => sum + readingsOf(l).length, 0),
    [allLines],
  );

  if (!attempt) return null;

  const ex = attempt.exercise || {};
  const sp = attempt.speaking || {};
  const multi = videos.length > 1;
  const inProgress = attempt.status === "in_progress";
  const activeIndex = Math.min(active, Math.max(videos.length - 1, 0));
  const current = videos[activeIndex];

  return (
    <div className="space-y-3">
      {/* Bài đang dở: nói rõ số liệu chỉ là của phần đã làm, kẻo giáo viên đọc
          "Bài tập 2/3" thành điểm của cả bài. */}
      {inProgress && (
        <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          Học viên đang học dở bài này ({attempt.progressPercent ?? 0}%). Số liệu bên dưới chỉ tính trên phần đã làm.
        </p>
      )}
      {/* Tóm tắt cả bài — điểm số đã ở dòng tiêu đề, đây là phần giải thích. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-gray-400"><ExerciseIcon size={14} /></span>
          {ex.total ? (
            <>
              Bài tập: <strong className="text-gray-900">{ex.correct}/{ex.total}</strong> câu đúng
            </>
          ) : (
            "Bài này không có bài tập"
          )}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-gray-400"><MicIcon size={14} /></span>
          {sp.scoredCount ? (
            <>
              Luyện nói: <strong className="text-gray-900">{sp.scoredCount}/{sp.lineCount}</strong> câu chấm được
              {totalReadings > allLines.length && (
                <span className="text-gray-400">· {totalReadings} lượt đọc</span>
              )}
            </>
          ) : sp.lineCount ? (
            `Luyện nói: ${sp.lineCount} câu, chưa câu nào chấm được`
          ) : (
            "Chưa luyện nói câu nào"
          )}
        </span>
        {multi && (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-gray-400"><VideoIcon size={14} /></span>
            {videos.length} video
          </span>
        )}
      </div>

      {multi && <VideoTabs videos={videos} active={activeIndex} onChange={setActive} />}

      {current && (
        <VideoPanel
          // key theo video: đổi video thì bộ lọc Đúng/Sai về lại "Tất cả".
          key={current.index ?? activeIndex}
          video={current}
          position={multi ? `Video ${activeIndex + 1}/${videos.length}` : null}
          inProgress={inProgress}
          recordingPath={recordingPath}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Thanh chọn video. Mỗi tab kèm điểm tóm tắt của video đó, để giáo viên thấy
 * ngay video nào học viên làm kém mà không phải mở lần lượt từng cái.
 */
function VideoTabs({ videos, active, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Chọn video"
      className="grid gap-1 p-1 rounded-xl bg-gray-100"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))" }}
    >
      {videos.map((v, i) => {
        const on = i === active;
        const ex = v.exercise || {};
        const avg = speakingAvgOf(v);
        return (
          <button
            key={v.index ?? i}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(i)}
            className={
              "text-left rounded-lg px-3 py-2 transition " +
              (on ? "bg-white shadow-sm ring-1 ring-gray-200" : "hover:bg-white/60")
            }
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <span
                className={
                  "shrink-0 w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center " +
                  (on ? "bg-primary text-gray-900" : "bg-gray-200 text-gray-500")
                }
              >
                {i + 1}
              </span>
              <span className={"truncate text-sm font-semibold " + (on ? "text-gray-900" : "text-gray-600")}>
                {v.title || `Video ${i + 1}`}
              </span>
            </span>
            <span className="flex items-center gap-3 mt-1 pl-[1.625rem] text-[11px] text-gray-500">
              <span>
                Bài tập <strong className="text-gray-800">{ex.total ? `${ex.correct}/${ex.total}` : "—"}</strong>
              </span>
              <span>
                Phát âm <strong className={toneOf(avg).text}>{avg ?? "—"}</strong>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function VideoPanel({ video, position, inProgress, recordingPath }) {
  const ex = video.exercise || {};
  const answers = ex.answers || [];
  const lines = video.speaking?.lines || [];
  const readings = lines.reduce((sum, l) => sum + readingsOf(l).length, 0);
  const avg = speakingAvgOf(video);
  const [filter, setFilter] = useState("all");

  const rightCount = answers.filter((a) => a.correct).length;
  const shown =
    filter === "all" ? answers : answers.filter((a) => (filter === "right" ? a.correct : !a.correct));

  return (
    <section id={`video-${video.index}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {position && (
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <span className="text-gray-400"><VideoIcon size={14} /></span>
          <p className="text-sm font-semibold text-gray-900 truncate">{video.title || `Video ${video.index + 1}`}</p>
          <span className="text-xs text-gray-400 shrink-0">{position}</span>
        </div>
      )}

      {/* ---------- Bài tập ---------- */}
      <div className="px-4 pt-4 pb-2">
        <SectionHeading
          icon={<ExerciseIcon size={15} />}
          iconClass="bg-amber-50 text-amber-600"
          title="Bài tập hiểu nội dung"
          meta={ex.total ? `${ex.correct}/${ex.total} câu đúng` : null}
        >
          {/* Lọc đúng/sai: bài 20 câu sai 3 thì tìm đúng 3 câu đó là việc
              giáo viên phải làm thường xuyên nhất. */}
          {answers.length > 0 && (
            <div className="inline-flex p-0.5 rounded-lg bg-gray-100 text-xs font-medium">
              <FilterTab on={filter === "all"} onClick={() => setFilter("all")}>
                Tất cả {answers.length}
              </FilterTab>
              <FilterTab on={filter === "right"} onClick={() => setFilter("right")} tone="green">
                Đúng {rightCount}
              </FilterTab>
              <FilterTab on={filter === "wrong"} onClick={() => setFilter("wrong")} tone="red">
                Sai {answers.length - rightCount}
              </FilterTab>
            </div>
          )}
        </SectionHeading>

        {answers.length === 0 ? (
          <Empty>{inProgress ? "Chưa làm câu nào ở phần này." : "Phần này không có bài tập."}</Empty>
        ) : shown.length === 0 ? (
          <Empty>{filter === "wrong" ? "Không có câu nào sai." : "Không có câu nào đúng."}</Empty>
        ) : (
          <ol className="divide-y divide-gray-100">
            {shown.map((a) => (
              <ExerciseRow key={answers.indexOf(a)} answer={a} index={answers.indexOf(a)} />
            ))}
          </ol>
        )}
      </div>

      {/* ---------- Luyện nói ---------- */}
      <div className="px-4 pt-4 pb-2 border-t border-gray-100">
        <SectionHeading
          icon={<MicIcon size={15} />}
          iconClass="bg-violet-50 text-violet-600"
          title="Luyện nói"
          meta={
            lines.length
              ? `${lines.length} câu` + (readings > lines.length ? ` · ${readings} lượt đọc` : "")
              : null
          }
        >
          {avg !== null && (
            <span className={"text-xs font-semibold px-2 py-1 rounded-md " + toneOf(avg).soft + " " + toneOf(avg).text}>
              TB {avg}
            </span>
          )}
        </SectionHeading>

        {lines.length === 0 ? (
          <Empty>{inProgress ? "Chưa luyện nói câu nào ở video này." : "Phần này chưa luyện nói câu nào."}</Empty>
        ) : (
          <ol className="divide-y divide-gray-100">
            {lines.map((l, i) => (
              <SpokenRow key={`${l.lineIndex}-${i}`} line={l} order={i + 1} recordingPath={recordingPath} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function SectionHeading({ icon, iconClass, title, meta, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-1">
      <span className={"w-7 h-7 rounded-lg flex items-center justify-center shrink-0 " + iconClass}>{icon}</span>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {meta && <p className="text-xs text-gray-400">{meta}</p>}
      <span className="ml-auto" />
      {children}
    </div>
  );
}

function FilterTab({ on, onClick, tone, children }) {
  const active =
    tone === "green" ? "bg-white text-green-700 shadow-sm" : tone === "red" ? "bg-white text-red-600 shadow-sm" : "bg-white text-gray-900 shadow-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={"px-2.5 py-1 rounded-md transition " + (on ? active : "text-gray-500 hover:text-gray-800")}
    >
      {children}
    </button>
  );
}

function Empty({ children }) {
  return <p className="text-sm text-gray-400 py-3">{children}</p>;
}

/**
 * Một câu bài tập (bản của màn giáo viên). Đáp án nằm NGAY DƯỚI câu hỏi chứ
 * không tách ra hộp bên phải: mắt đọc một mạch từ trên xuống, và hàng không
 * bị vỡ khi modal hẹp.
 */
function ExerciseRow({ answer, index }) {
  const ok = Boolean(answer.correct);
  return (
    <li className="flex gap-3 py-3">
      <span
        className={
          "shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white " +
          (ok ? "bg-green-500" : "bg-red-500")
        }
        aria-label={ok ? "Đúng" : "Sai"}
      >
        {ok ? <CheckIcon size={10} /> : <CrossIcon size={9} />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400">
          Câu {index + 1}
          {answer.type && <> · {answer.type}</>}
        </p>
        <p className="text-[15px] text-gray-900 leading-snug mt-0.5">{answer.question}</p>
        {answer.pinyin && <p className="text-xs text-gray-400 mt-0.5">{answer.pinyin}</p>}

        <dl className="mt-2 grid grid-cols-[6.5rem_1fr] gap-x-2 gap-y-1 text-sm">
          <dt className="text-xs text-gray-400 pt-0.5">Học viên chọn</dt>
          <dd className={ok ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
            {answer.yourAnswer}
            {answer.yourPinyin && <span className="block text-xs font-normal text-gray-400">{answer.yourPinyin}</span>}
          </dd>
          {!ok && (
            <>
              <dt className="text-xs text-gray-400 pt-0.5">Đáp án đúng</dt>
              <dd className="text-green-700 font-medium">
                {answer.correctAnswer}
                {answer.correctPinyin && (
                  <span className="block text-xs font-normal text-gray-400">{answer.correctPinyin}</span>
                )}
              </dd>
            </>
          )}
          {/* Dạng Đúng/Sai: câu sửa lại cho đúng. */}
          {!ok && answer.correction && (
            <>
              <dt className="text-xs text-gray-400 pt-0.5">Sửa lại</dt>
              <dd className="text-gray-700">{answer.correction}</dd>
            </>
          )}
        </dl>
      </div>
    </li>
  );
}

function SpokenRow({ line, order, recordingPath }) {
  const [open, setOpen] = useState(false);
  const readings = readingsOf(line);
  const many = readings.length > 1;
  const scored = line.score !== null && line.score !== undefined;
  const tone = toneOf(line.score);

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-5 text-xs text-gray-400 text-right tabular-nums">{order}</span>
        <span
          className={
            "shrink-0 w-11 h-8 rounded-lg ring-1 ring-inset flex items-center justify-center text-sm font-bold tabular-nums " +
            tone.soft + " " + tone.text + " " + tone.ring
          }
          title={scored ? `Điểm lượt đọc cuối: ${line.score}/100` : "iFLYTEK không chấm được lượt đọc cuối"}
        >
          {scored ? line.score : "–"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-gray-900 leading-snug truncate">{line.hanzi}</p>
          {line.pinyin && <p className="text-xs text-gray-400 truncate">{line.pinyin}</p>}
          {!scored && (
            <p className="text-[11px] text-gray-400">Không chấm được — thường do đọc thiếu hoặc micro quá nhỏ</p>
          )}
        </div>

        {/* Đọc nhiều lần thì hiện luôn đường tiến bộ — "40 → 55 → 82" nói được
            nhiều hơn một con số 82 đứng một mình. */}
        {many && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="hidden sm:inline-flex shrink-0 items-center gap-1.5 text-xs text-gray-500 px-2 py-1 rounded-md hover:bg-gray-100"
          >
            <span className="font-medium text-gray-700">{readings.length} lần</span>
            <span className="tabular-nums">{readings.map((r) => r.score ?? "–").join(" → ")}</span>
            <Chevron open={open} />
          </button>
        )}

        {/* Không có attemptId = bản ghi chi tiết đã bị dọn — không hiện nút để
            khỏi dẫn tới lỗi 404. */}
        {line.attemptId && <RecordingPlayer path={recordingPath(line.attemptId)} />}
      </div>

      {many && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden mt-1 ml-[4.75rem] inline-flex items-center gap-1.5 text-xs text-gray-500"
        >
          {readings.length} lần: {readings.map((r) => r.score ?? "–").join(" → ")}
          <Chevron open={open} />
        </button>
      )}

      {many && open && (
        <ul className="mt-2 ml-[4.75rem] rounded-lg bg-gray-50 divide-y divide-gray-100">
          {readings.map((r, i) => {
            const t = toneOf(r.score);
            const last = i === readings.length - 1;
            return (
              <li key={i} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                <span className="text-gray-500 w-12 shrink-0">Lần {i + 1}</span>
                <span className={"font-bold w-8 shrink-0 tabular-nums " + t.text}>{r.score ?? "–"}</span>
                {last && <span className="text-[11px] text-gray-400">lượt cuối</span>}
                <span className="flex-1" />
                {r.attemptId && <RecordingPlayer path={recordingPath(r.attemptId)} />}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function Chevron({ open }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      className={"transition-transform " + (open ? "rotate-180" : "")}
    >
      <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Dùng chung với màn lịch sử của HỌC VIÊN (review/ExerciseReview) — giữ
   nguyên giao diện, không đổi theo màn giáo viên. */

/**
 * Một câu bài tập — ĐÚNG HAY SAI ĐỀU HIỆN.
 *
 * Dấu ✓/✗ nằm bên trái và thẳng cột, nên lướt mắt dọc theo mép trái là thấy
 * ngay sai những câu nào, không phải đọc từng câu.
 */
export function AnswerRow({ answer, index }) {
  const ok = Boolean(answer.correct);

  return (
    <li
      className={
        "rounded-xl border p-3 " +
        (ok ? "border-gray-100 bg-white" : "border-red-100 bg-red-50/40")
      }
    >
      <div className="flex gap-3">
        <span
          className={
            "shrink-0 w-7 h-7 rounded-full flex items-center justify-center " +
            (ok ? "bg-green-500 text-white" : "bg-red-500 text-white")
          }
          aria-label={ok ? "Đúng" : "Sai"}
        >
          {ok ? <CheckIcon /> : <CrossIcon />}
        </span>
        <span className="shrink-0 w-5 text-sm text-gray-300 font-medium pt-0.5">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1 flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-4">
          <div className="min-w-0 flex-1">
            {answer.type && (
              <p className="text-[11px] text-gray-400">{answer.type}</p>
            )}
            <p className="text-[15px] leading-snug">{answer.question}</p>
            {answer.pinyin && (
              <p className="text-[11px] text-gray-400 italic">{answer.pinyin}</p>
            )}
          </div>

          <div
            className={
              "lg:w-64 shrink-0 rounded-lg px-3 py-2 text-sm " +
              (ok ? "bg-green-50" : "bg-white border border-red-100")
            }
          >
            {ok ? (
              <>
                <p className="text-green-700 font-medium">{answer.yourAnswer}</p>
                {answer.yourPinyin && (
                  <p className="text-[11px] text-gray-400">{answer.yourPinyin}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-red-600">
                  <Tag>Bạn chọn:</Tag>
                  <span className="font-medium">{answer.yourAnswer}</span>
                </p>
                {answer.yourPinyin && (
                  <p className="text-[11px] text-gray-400 pl-[4.5rem]">
                    {answer.yourPinyin}
                  </p>
                )}
                <p className="text-green-700 mt-0.5">
                  <Tag>Đáp án:</Tag>
                  <span className="font-medium">{answer.correctAnswer}</span>
                </p>
                {answer.correctPinyin && (
                  <p className="text-[11px] text-gray-400 pl-[4.5rem]">
                    {answer.correctPinyin}
                  </p>
                )}
                {/* Dạng Đúng/Sai: câu sửa lại cho đúng. Không có nó thì học
                    viên biết mình sai nhưng không biết câu đúng viết thế nào. */}
                {answer.correction && (
                  <p className="text-gray-600 mt-0.5">
                    <Tag>Sửa lại:</Tag>
                    {answer.correction}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function Tag({ children }) {
  return (
    <span className="inline-block w-[4.5rem] text-[11px] text-gray-400 align-baseline">
      {children}
    </span>
  );
}
