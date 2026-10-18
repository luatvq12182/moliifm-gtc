import { useMemo, useState } from "react";
import RecordingPlayer from "./RecordingPlayer.jsx";
import ScoreCard from "./ScoreCard.jsx";
import {
  CheckIcon,
  CrossIcon,
  ExerciseIcon,
  HeadphoneIcon,
  MicIcon,
  VideoIcon,
} from "./icons.jsx";

/**
 * Nội dung chi tiết một lượt hoàn thành bài học.
 *
 * DÙNG CHUNG cho màn lịch sử của học viên và màn đối chiếu của giáo viên —
 * hai bên nhìn cùng một thứ thì khi học viên gọi điện khiếu nại, hai người
 * đang nói về cùng một màn hình.
 *
 * `recordingPath` khác nhau giữa hai bên (route học viên chỉ cho nghe bản ghi
 * của chính mình), nên nơi gọi truyền vào.
 *
 * BÀI TẬP chia theo từng video, LUYỆN NÓI gộp thành một mục ở cuối: bài tập
 * thuộc hẳn về nội dung của một video, còn hội thoại thì học viên cảm nhận
 * như một mạch liền.
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

export default function AttemptDetail({ attempt, recordingPath }) {
  const videos = useMemo(() => attempt?.videos || [], [attempt]);
  const allLines = useMemo(
    () => videos.flatMap((v) => (v.speaking?.lines || []).map((l) => ({ ...l, videoTitle: v.title }))),
    [videos],
  );
  // TỔNG LƯỢT ĐỌC TÍNH TỪ CHÍNH DANH SÁCH ĐANG HIỆN, không lấy
  // `speaking.totalReadings` của máy chủ.
  //
  // Hai nguồn sẽ lệch nhau với bản ghi cũ (lượt đọc có xảy ra nhưng không còn
  // chi tiết để liệt kê), và khi đó thẻ điểm báo "7 lượt đọc" trong khi danh
  // sách bên dưới chỉ có 5 — không bao giờ hiện một con số mà mình không chỉ
  // ra được nó gồm những gì.
  const totalReadings = useMemo(
    () => allLines.reduce((sum, l) => sum + readingsOf(l).length, 0),
    [allLines],
  );

  if (!attempt) return null;

  const ex = attempt.exercise || {};
  const sp = attempt.speaking || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <ScoreCard
          icon={<ExerciseIcon size={20} />}
          label="Bài tập"
          // null = bài không có bài tập, KHÁC HẲN 0 điểm.
          value={ex.score100 ?? null}
          note={ex.total ? `${ex.correct}/${ex.total} câu đúng` : "Bài này không có bài tập"}
        />
        <ScoreCard
          icon={<HeadphoneIcon size={20} />}
          label="Phát âm"
          value={sp.avgScore ?? null}
          note={
            sp.scoredCount
              ? `${sp.scoredCount}/${sp.lineCount} câu chấm được` +
                (totalReadings > allLines.length ? ` · ${totalReadings} lượt đọc` : "")
              : sp.lineCount
                ? `${sp.lineCount} câu, chưa câu nào chấm được`
                : "Chưa luyện nói câu nào"
          }
        />
      </div>

      {videos.map((v) => (
        <VideoSection key={v.index} video={v} />
      ))}

      {allLines.length > 0 && (
        <SpeakingSectionCard
          lines={allLines}
          totalReadings={totalReadings}
          multiVideo={videos.length > 1}
          recordingPath={recordingPath}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VideoSection({ video }) {
  const ex = video.exercise || {};
  const answers = ex.answers || [];
  const [filter, setFilter] = useState("all");

  const shown =
    filter === "all"
      ? answers
      : answers.filter((a) => (filter === "right" ? a.correct : !a.correct));
  const rightCount = answers.filter((a) => a.correct).length;

  return (
    <section
      id={`video-${video.index}`}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden scroll-mt-4"
    >
      <header className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0">
          <VideoIcon size={14} />
        </span>
        <p className="font-semibold flex-1 min-w-0 truncate">
          {video.title || `Video ${video.index + 1}`}
        </p>
        {ex.total ? (
          <p className="text-xs text-gray-400 shrink-0">
            {ex.correct}/{ex.total} câu đúng
          </p>
        ) : null}
      </header>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase mr-auto">
            <span className="text-primary-dark"><ExerciseIcon size={15} /></span>
            Bài tập hiểu nội dung
          </span>

          {/* Lọc đúng/sai: khi bài có 20 câu mà chỉ sai 3, tìm 3 câu đó giữa
              danh sách dài là việc phải làm thường xuyên nhất. */}
          {answers.length > 0 && (
            <>
              <Chip active={filter === "all"} onClick={() => setFilter("all")}>
                Tất cả ({answers.length})
              </Chip>
              <Chip
                active={filter === "right"}
                tone="green"
                onClick={() => setFilter("right")}
              >
                <CheckIcon size={10} /> Đúng ({rightCount})
              </Chip>
              <Chip
                active={filter === "wrong"}
                tone="red"
                onClick={() => setFilter("wrong")}
              >
                <CrossIcon size={9} /> Sai ({answers.length - rightCount})
              </Chip>
            </>
          )}
        </div>

        {answers.length === 0 ? (
          <p className="text-xs text-gray-400">Phần này không có bài tập.</p>
        ) : shown.length === 0 ? (
          <p className="text-xs text-gray-400">
            {filter === "wrong" ? "Không có câu nào sai." : "Không có câu nào đúng."}
          </p>
        ) : (
          <ol className="space-y-2">
            {shown.map((a) => (
              <AnswerRow key={answers.indexOf(a)} answer={a} index={answers.indexOf(a)} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Chip({ active, tone, onClick, children }) {
  const base = "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition ";
  const styles = active
    ? tone === "green"
      ? "border-green-300 bg-green-50 text-green-700"
      : tone === "red"
        ? "border-red-300 bg-red-50 text-red-600"
        : "border-primary-dark bg-primary/25 text-gray-800"
    : "border-gray-200 text-gray-500 hover:bg-gray-50";
  return (
    <button type="button" onClick={onClick} className={base + styles}>
      {children}
    </button>
  );
}

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

/* ------------------------------------------------------------------ */

function SpeakingSectionCard({ lines, totalReadings, multiVideo, recordingPath }) {

  return (
    <section
      id="speaking"
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden scroll-mt-4"
    >
      <header className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
          <MicIcon size={15} />
        </span>
        <p className="font-semibold flex-1 text-xs tracking-wide uppercase text-gray-500">
          Luyện nói
        </p>
        <p className="text-xs text-gray-400 shrink-0">
          {lines.length} câu
          {totalReadings > lines.length ? ` · ${totalReadings} lượt đọc` : ""}
        </p>
      </header>

      <div className="p-3 grid sm:grid-cols-2 gap-x-3 gap-y-1">
        {lines.map((l, i) => (
          <SpokenRow
            key={`${l.videoIndex}-${l.lineIndex}-${i}`}
            line={l}
            order={i + 1}
            showVideo={multiVideo}
            recordingPath={recordingPath}
          />
        ))}
      </div>
    </section>
  );
}

const toneOf = (v) =>
  v === null || v === undefined
    ? { text: "text-gray-300", soft: "bg-gray-50" }
    : v >= 80
      ? { text: "text-green-600", soft: "bg-green-50" }
      : v >= 60
        ? { text: "text-amber-500", soft: "bg-amber-50" }
        : { text: "text-red-500", soft: "bg-red-50" };

function SpokenRow({ line, order, showVideo, recordingPath }) {
  const [open, setOpen] = useState(false);
  const readings = readingsOf(line);
  const many = readings.length > 1;
  const tone = toneOf(line.score);
  const scored = line.score !== null && line.score !== undefined;

  return (
    <div className="rounded-xl hover:bg-gray-50/80 transition">
      <div className="flex items-center gap-2.5 px-2 py-2">
        <span className="shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-[11px] font-medium flex items-center justify-center">
          {order}
        </span>
        <span
          className={
            "shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold " +
            tone.soft + " " + tone.text
          }
          title={
            scored
              ? `Điểm lượt đọc cuối: ${line.score}/100`
              : "iFLYTEK không chấm được lượt đọc cuối"
          }
        >
          {scored ? line.score : "–"}
        </span>

        <div className="min-w-0 flex-1">
          {showVideo && line.videoTitle && (
            <p className="text-[10px] text-gray-300">{line.videoTitle}</p>
          )}
          <p className="text-[15px] leading-snug truncate">{line.hanzi}</p>
          {line.pinyin && (
            <p className="text-[11px] text-gray-400 truncate">{line.pinyin}</p>
          )}
          {!scored && (
            <p className="text-[10px] text-gray-400">
              Không chấm được — thường do đọc thiếu hoặc micro quá nhỏ
            </p>
          )}

          {/* Đọc nhiều lần thì hiện luôn đường tiến bộ ngay trên hàng —
              "40 → 55 → 82" nói được nhiều hơn một con số 82 đứng một mình,
              mà không bắt ai phải bấm mở ra. */}
          {many && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-primary-dark"
            >
              <span>đọc {readings.length} lần</span>
              <span className="text-gray-400">
                {readings.map((r) => r.score ?? "–").join(" → ")}
              </span>
              <Chevron open={open} />
            </button>
          )}
        </div>

        {/* Không có attemptId nghĩa là bản ghi chi tiết đã bị dọn — không hiện
            nút để khỏi dẫn người dùng tới một lỗi 404. */}
        {line.attemptId && <RecordingPlayer path={recordingPath(line.attemptId)} />}
      </div>

      {many && open && (
        <ul className="pb-2 pl-[4.6rem] pr-2 space-y-1">
          {readings.map((r, i) => {
            const t = toneOf(r.score);
            const last = i === readings.length - 1;
            return (
              <li
                key={i}
                className="flex items-center gap-2.5 text-xs rounded-lg px-2 py-1 bg-white border border-gray-100"
              >
                <span className="text-gray-400 w-11 shrink-0">Lần {i + 1}</span>
                <span className={"font-bold w-7 shrink-0 " + t.text}>
                  {r.score ?? "–"}
                </span>
                {last && (
                  <span className="text-[10px] text-gray-400 shrink-0">lượt cuối</span>
                )}
                <span className="flex-1" />
                {r.attemptId && <RecordingPlayer path={recordingPath(r.attemptId)} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
