import { useState } from "react";
import RecordingPlayer from "../RecordingPlayer.jsx";

const toneOf = (v) =>
  v === null || v === undefined
    ? "bg-gray-50 text-gray-300"
    : v >= 80
      ? "bg-green-50 text-green-600"
      : v >= 60
        ? "bg-amber-50 text-amber-600"
        : "bg-red-50 text-red-500";

const norm = (s) => String(s || "").replace(/\s+/g, "");

/** Các lượt đọc của một câu; bản ghi cũ không có `attempts` thì dựng tạm một lượt. */
function readingsOf(line) {
  if (Array.isArray(line.attempts) && line.attempts.length > 0) return line.attempts;
  if (!line.attemptId) return [];
  return [{ attemptId: line.attemptId, score: line.score }];
}

/**
 * Xem lại phần luyện nói của MỘT video.
 *
 * Mỗi câu có hai nút đặt cạnh nhau: "Nghe giọng mẫu" phát đúng đoạn đó trong
 * video bên trái, "Nghe giọng bạn" phát bản ghi âm. Nghe liền hai cái là cách nhanh nhất
 * để tự nhận ra mình đọc khác mẫu ở đâu.
 *
 * "NGHE GIỌNG MẪU" CHỈ BẬT KHI CÂU CÒN KHỚP. Video và hội thoại lấy từ bài học hiện
 * tại, không phải bản chụp lúc học — giảng viên sửa bài (thêm, bớt, đổi câu)
 * thì vị trí câu có thể lệch đi. So chữ Hán của câu trong bài hiện tại với câu
 * đã lưu; khác nhau thì ẩn nút, thà thiếu còn hơn phát nhầm câu.
 */
export default function SpeakingReview({ lines, dialogue, onPlaySample, recordingPath }) {
  if (!lines || lines.length === 0) {
    return <p className="text-sm text-gray-500">Phần này chưa có câu luyện nói nào.</p>;
  }

  return (
    <ul className="space-y-2">
      {lines.map((line, i) => {
        const sample = (dialogue || [])[line.lineIndex];
        const canPlaySample =
          Boolean(onPlaySample) &&
          sample &&
          norm(sample.hanzi) === norm(line.hanzi) &&
          typeof sample.startTime === "number" &&
          sample.endTime > sample.startTime;

        return (
          <SpokenLine
            key={`${line.videoIndex}-${line.lineIndex}-${i}`}
            line={line}
            vi={sample && norm(sample.hanzi) === norm(line.hanzi) ? sample.vi : ""}
            onPlaySample={
              canPlaySample ? () => onPlaySample(sample.startTime, sample.endTime) : null
            }
            recordingPath={recordingPath}
          />
        );
      })}
    </ul>
  );
}

function SpokenLine({ line, vi, onPlaySample, recordingPath }) {
  const [open, setOpen] = useState(false);
  const readings = readingsOf(line);
  const many = readings.length > 1;
  const scored = line.score !== null && line.score !== undefined;

  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <div className="flex gap-3">
        <span
          className={
            "shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold " +
            toneOf(line.score)
          }
          title={scored ? `Điểm lượt đọc cuối: ${line.score}/100` : "Không chấm được lượt đọc cuối"}
        >
          {scored ? line.score : "–"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-base leading-snug">{line.hanzi}</p>
          {line.pinyin && <p className="text-xs text-gray-500">{line.pinyin}</p>}
          {vi && <p className="text-xs text-gray-400 mt-0.5">{vi}</p>}
          {!scored && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              Không chấm được — thường do đọc thiếu hoặc micro quá nhỏ
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {onPlaySample && (
              <button
                type="button"
                onClick={onPlaySample}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-dark hover:text-primary-dark"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="15" height="14" rx="2" />
                  <path d="M17 9.5l5-3v11l-5-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Nghe giọng mẫu
              </button>
            )}
            {line.attemptId && (
              <RecordingPlayer path={recordingPath(line.attemptId)} label="Nghe giọng bạn" />
            )}

            {/* Đọc nhiều lần thì hiện luôn đường tiến bộ — "20 → 28 → 36" nói
                được nhiều hơn một con số đứng một mình. */}
            {many && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="ml-auto text-[11px] text-gray-500 hover:text-primary-dark"
              >
                đọc {readings.length} lần: {readings.map((r) => r.score ?? "–").join(" → ")}
                <span className="ml-1">{open ? "▴" : "▾"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {many && open && (
        <ul className="mt-2 ml-14 space-y-1">
          {readings.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-2.5 text-xs rounded-lg px-2 py-1 bg-gray-50"
            >
              <span className="text-gray-400 w-11">Lần {i + 1}</span>
              <span className={"font-bold w-7 " + toneOf(r.score).split(" ")[1]}>
                {r.score ?? "–"}
              </span>
              {i === readings.length - 1 && (
                <span className="text-[10px] text-gray-400">lượt cuối</span>
              )}
              <span className="flex-1" />
              {r.attemptId && <RecordingPlayer path={recordingPath(r.attemptId)} />}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
