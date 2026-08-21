import { useEffect, useRef, useState } from "react";
import {
  assessPronunciation,
  pinyinWithToneMarks,
} from "../lib/iflytekSpeech.js";

// Phân loại lỗi để tô màu ô chữ. Ba nhóm:
//  - ok  -> xanh (đọc đúng)
//  - lỗi phát âm (sai thanh điệu / sai vận mẫu / sai thanh mẫu / đọc sai)
//    -> đỏ, vì đây là sai cách phát âm, học viên cần đọc lại cho đúng.
//  - lỗi nhịp đọc (đọc thừa / đọc thiếu / đọc lặp)
//    -> cam, vì chữ đọc không sai âm, chỉ là thừa/thiếu/lặp khi đọc.
const RHYTHM_ISSUES = ["đọc thừa", "đọc thiếu", "đọc lặp"];

function charStyle(c) {
  if (c.ok) {
    return {
      box: "text-green-700 bg-green-50 border-green-200",
      label: "text-green-600",
    };
  }
  if (RHYTHM_ISSUES.includes(c.issue)) {
    return {
      box: "text-amber-700 bg-amber-50 border-amber-200",
      label: "text-amber-600",
    };
  }
  return {
    box: "text-red-700 bg-red-50 border-red-200",
    label: "text-red-600",
  };
}

// Modal luyện nói tập trung cho 1 câu — mở ra khi bấm vào 1 dòng trong
// SpeakingSection. results/onSaveResult do component cha (SpeakingSection)
// quản lý, để tiến độ vẫn giữ nguyên khi đóng/mở modal qua lại giữa các câu.
export default function SpeakingPracticeModal({
  open,
  dialogue,
  currentIndex,
  results,
  lessonContext,
  onClose,
  onNavigate,
  onRequestPlaySegment,
  onSaveResult,
}) {
  const [phase, setPhase] = useState("idle"); // idle | listening | result | error
  const [errorMsg, setErrorMsg] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [showPinyin, setShowPinyin] = useState(false);
  const [level, setLevel] = useState(0);
  const sessionRef = useRef(null);

  const line = dialogue[currentIndex];
  const existingResult = results[currentIndex];
  const total = dialogue.length;
  const attemptedCount = Object.keys(results).length;

  useEffect(() => {
    setShowPinyin(false);
    setShowTranslation(false);
    setErrorMsg("");
    setPhase(existingResult ? "result" : "idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, open]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) sessionRef.current.stop();
    };
  }, []);

  if (!open || !line) return null;

  const startRecording = async () => {
    setPhase("connecting"); // đang kết nối + chuẩn bị mic, CHƯA thu
    setErrorMsg("");

    // Dải sóng giờ do chính phiên ghi âm cấp mức âm lượng, dùng chung một
    // MediaStream — không mở microphone thêm lần nữa (xem micLevel.js).
    const session = assessPronunciation(line.hanzi, {
      onListening: () => setPhase("listening"), // mic đã thu thật sự
      onLevel: setLevel,
      // Bối cảnh để máy chủ lưu vào lịch sử luyện nói (chỉ khi
      // PRACTICE_HISTORY_ENABLED bật ở backend — client luôn gửi, server quyết).
      context: {
        ...(lessonContext || {}),
        lineIndex: currentIndex,
        pinyin: line.pinyin || "",
        vi: line.vi || "",
      },
    });
    sessionRef.current = session;

    try {
      const result = await session.result;
      onSaveResult(currentIndex, result);
      // Kể cả khi bị từ chối (đọc chưa khớp), vẫn vào phase "result" để hiển
      // thị thông báo văn minh + "Nội dung bạn nói", thay vì màn hình lỗi đỏ.
      setPhase("result");
    } catch (e) {
      setErrorMsg(typeof e === "string" ? e : "Có lỗi xảy ra, thử lại nhé.");
      setPhase("error");
    } finally {
      sessionRef.current = null;
      setLevel(0);
    }
  };

  // Người dùng chủ động bấm "Dừng" — ép phiên nhận diện kết thúc ngay với
  // phần đã thu được (thay vì chờ Azure tự phát hiện im lặng, thứ đôi khi
  // không xảy ra và gây đơ).
  const stopRecording = () => {
    if (sessionRef.current) {
      setPhase("processing");
      sessionRef.current.stop();
    }
  };

  const goNext = () => {
    if (currentIndex < total - 1) onNavigate(currentIndex + 1);
    else onClose();
  };

  const goPrev = () => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 shrink-0">
          <span className="text-xs text-gray-400">
            Câu {currentIndex + 1}/{total}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 pt-7 pb-5 text-center overflow-y-auto">
          <span className="text-[11px] font-medium tracking-wide text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
            LUYỆN NÓI
          </span>

          <button
            onClick={() =>
              onRequestPlaySegment(
                line.videoIndex,
                line.startTime,
                line.endTime,
              )
            }
            className="mt-6 mx-auto w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100"
          >
            <SpeakerIcon />
          </button>
          <p className="text-[11px] text-gray-400 mt-1.5">Nghe câu mẫu</p>

          {showPinyin && (
            <p className="text-sm text-gray-500 mt-1.5">{line.pinyin}</p>
          )}
          <p className="text-2xl font-medium mt-1.5">{line.hanzi}</p>
          {showTranslation && (
            <p className="text-xs text-gray-500 mt-1.5">{line.vi}</p>
          )}

          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              onClick={() => setShowPinyin((v) => !v)}
              className="text-xs text-primary-dark underline"
            >
              {showPinyin ? "Ẩn phiên âm" : "Hiện phiên âm"}
            </button>
            <button
              onClick={() => setShowTranslation((v) => !v)}
              className="text-xs text-primary-dark underline"
            >
              {showTranslation ? "Ẩn bản dịch" : "Hiện bản dịch"}
            </button>
          </div>

          {/* Nghe lại chính giọng mình — công cụ mạnh nhất trong luyện phát âm:
              nghe mình đọc rồi nghe câu mẫu, tai sẽ tự chỉ ra chỗ khác nhau mà
              con số không nói được. Bản ghi chỉ nằm trong bộ nhớ trình duyệt,
              tải lại trang là mất. */}
          {phase === "result" && existingResult?.audioUrl && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <PlaybackButton src={existingResult.audioUrl} />
              <button
                onClick={() =>
                  onRequestPlaySegment(
                    line.videoIndex,
                    line.startTime,
                    line.endTime,
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <SpeakerSmallIcon />
                Câu mẫu
              </button>
            </div>
          )}

          {phase === "result" && existingResult && existingResult.rejected && (
            <div className="mt-5 text-left bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-2.5 mb-3">
                <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <WarnIcon />
                </span>
                <p className="text-sm text-amber-800 leading-snug">
                  {existingResult.rejectMessage ||
                    "Bài đọc chưa khớp với câu mẫu nên chưa thể chấm điểm."}
                </p>
              </div>

              {/* Cho học viên tự đối chiếu: câu mẫu vs nội dung họ vừa đọc. */}
              <div className="space-y-2">
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Câu mẫu:</p>
                  <p className="text-sm text-gray-700 bg-white rounded-lg border border-gray-200 px-3 py-2">
                    {line.hanzi}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">
                    Nội dung bạn vừa đọc:
                  </p>
                  <p className="text-sm text-gray-700 bg-white rounded-lg border border-gray-200 px-3 py-2">
                    {existingResult.spokenText
                      ? existingResult.spokenText
                      : "— không nghe rõ tiếng nói —"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {phase === "result" && existingResult && !existingResult.rejected && (
            <div className="mt-5 text-left bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-center mb-3">
                <ScoreRing value={existingResult.pronScore} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <ScoreTag
                  label="Phát âm"
                  value={existingResult.accuracy}
                  max={25}
                />
                <ScoreTag
                  label="Thanh điệu"
                  value={existingResult.prosody}
                  max={25}
                />
                <ScoreTag
                  label="Trôi chảy"
                  value={existingResult.fluency}
                  max={25}
                />
                <ScoreTag
                  label="Đầy đủ"
                  value={existingResult.completeness}
                  max={25}
                />
              </div>

              <div className="mb-3">
                <p className="text-[11px] text-gray-400 mb-1">
                  Nội dung bạn nói:
                </p>
                <p className="text-sm text-gray-700 bg-white rounded-lg border border-gray-200 px-3 py-2">
                  {existingResult.spokenText
                    ? existingResult.spokenText
                    : "— không nghe rõ —"}
                </p>
              </div>

              {/* CÁCH CHỈ LỖI THEO TỪ (thay cho theo từng chữ rời).
                  Chấm từng chữ tuy chi tiết nhưng báo sai oan rất nhiều, dồn
                  vào âm tiết thanh nhẹ. Máy chủ gom chữ thành từ dựa vào phiên
                  âm câu mẫu — xem gtc-api/src/lib/wordFeedback.js. */}
              {existingResult.words?.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {existingResult.words.map((w, i) => (
                      <WordChip key={i} word={w} />
                    ))}
                  </div>
                </div>
              )}

              {/* Chỉ nêu ĐÚNG MỘT từ đáng luyện nhất. Đưa cùng lúc năm chỗ cần
                  sửa thì học viên không sửa chỗ nào cả. */}
              {existingResult.focusWord && (
                <div className="flex items-center gap-3 bg-white rounded-xl border border-red-200 px-3 py-2.5 mb-3">
                  <div className="min-w-0">
                    <p className="text-lg font-medium text-red-600 leading-tight">
                      {existingResult.focusWord.content}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-tight">
                      {existingResult.focusWord.issue || "Phát âm chưa đúng"}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Luyện lại từ này vài lần nhé
                    </p>
                  </div>
                  <div className="shrink-0 w-16">
                    <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${existingResult.focusWord.score}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-red-500 text-right mt-1 leading-none">
                      {existingResult.focusWord.score}
                    </p>
                  </div>
                </div>
              )}

              {existingResult.feedback && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-3">
                  <p className="text-[10px] font-medium tracking-wide text-amber-600 mb-1">
                    PHẢN HỒI
                  </p>
                  <p className="text-sm text-gray-700 leading-snug">
                    {existingResult.feedback}
                  </p>
                </div>
              )}

              {/* Chi tiết từng chữ vẫn giữ, nhưng ẩn đi — ai muốn soi kỹ thì mở.
                  Mặc định không đập vào mắt một mảng chữ đỏ nữa. */}
              {existingResult.chars?.length > 0 && (
                <CharDetail chars={existingResult.chars} />
              )}
            </div>
          )}

          {phase === "error" && (
            <p className="text-sm text-red-600 mt-4">{errorMsg}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          {phase === "connecting" ? (
            <div className="flex items-center justify-center gap-2.5 py-3">
              <Spinner />
              <span className="text-sm text-gray-600">
                Đang chuẩn bị micro… đợi chút rồi hãy đọc nhé
              </span>
            </div>
          ) : phase === "listening" ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"
                  style={{ boxShadow: "0 0 0 4px rgba(226,75,74,0.15)" }}
                />
                <span className="text-sm text-gray-600 flex-1">
                  Đang lắng nghe… đọc xong bấm "Dừng"
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Waveform level={level} />
                </div>
                <button
                  onClick={stopRecording}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-800 text-white text-sm font-medium hover:bg-gray-900"
                >
                  <StopIcon />
                  Dừng
                </button>
              </div>
            </>
          ) : phase === "processing" ? (
            <div className="flex items-center justify-center gap-2.5 py-3">
              <Spinner />
              <span className="text-sm text-gray-600">
                Đang chấm điểm, chờ chút nhé…
              </span>
            </div>
          ) : (
            <button
              onClick={startRecording}
              className="w-full py-3 rounded-2xl font-medium bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white flex items-center justify-center gap-2"
            >
              <MicIcon />
              {phase === "result" ? "Luyện lại câu này" : "Bấm để bắt đầu nói"}
            </button>
          )}

          {phase !== "listening" &&
            phase !== "processing" &&
            phase !== "connecting" && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="flex-1 py-2 rounded-xl text-sm border border-gray-200 text-gray-500 disabled:opacity-40"
                >
                  ← Câu trước
                </button>
                <button
                  onClick={goNext}
                  className="flex-1 py-2 rounded-xl text-sm bg-gray-800 text-white"
                >
                  {currentIndex === total - 1 ? "Hoàn tất" : "Câu tiếp theo →"}
                </button>
              </div>
            )}

          <p className="text-center text-[11px] text-gray-400 mt-3">
            Đã luyện: {attemptedCount}/{total} câu
          </p>
        </div>
      </div>
    </div>
  );
}

// Một TỪ trong câu. Màu theo mức độ, không phải đúng/sai nhị phân — vì ranh
// giới giữa "đọc được" và "đọc sai" vốn không dứt khoát.
function WordChip({ word }) {
  const tone =
    word.status === "good"
      ? "border-green-300 bg-green-50 text-green-700"
      : word.status === "fair"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-red-300 bg-red-50 text-red-700";

  return (
    <span
      className={"px-3 py-1.5 rounded-xl border text-base font-medium " + tone}
    >
      {word.content}
    </span>
  );
}

// Chi tiết từng chữ — giữ lại cho ai muốn soi kỹ, nhưng mặc định thu gọn.
function CharDetail({ chars }) {
  const [open, setOpen] = useState(false);
  const wrongCount = chars.filter((c) => !c.ok).length;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-gray-400 underline"
      >
        {open
          ? "Ẩn chi tiết từng chữ"
          : `Xem chi tiết từng chữ (${wrongCount} chữ cần chú ý)`}
      </button>

      {open && (
        <>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chars.map((c, i) => {
              const style = charStyle(c);
              return (
                <div
                  key={i}
                  className={
                    "flex flex-col items-center px-2.5 py-1.5 rounded-lg border " +
                    style.box
                  }
                >
                  <span className="text-base font-medium leading-tight">
                    {c.content}
                  </span>
                  {c.pinyin && (
                    <span className="text-[10px] leading-tight">
                      {pinyinWithToneMarks(c.pinyin)}
                    </span>
                  )}
                  {!c.ok && c.issue && (
                    <span
                      className={
                        "text-[9px] font-medium leading-tight mt-0.5 " +
                        style.label
                      }
                    >
                      {c.issue}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Nút phát bản ghi của học viên. Tự dựng <audio> thay vì dùng thẻ có sẵn để
// kiểm soát được trạng thái đang phát và tự dừng khi đổi sang câu khác.
function PlaybackButton({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  // Đổi câu -> src đổi -> dừng và dựng lại thẻ audio mới.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [src]);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-100 text-amber-800 text-xs font-medium hover:bg-amber-200"
    >
      {playing ? <StopIcon /> : <PlaySmallIcon />}
      {playing ? "Dừng" : "Nghe lại giọng bạn"}
    </button>
  );
}

function PlaySmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function SpeakerSmallIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="3 9 3 15 8 15 13 20 13 4 8 9 3 9" />
      <path d="M16 8a5 5 0 010 8" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="animate-spin text-amber-500"
    >
      <path d="M12 2a10 10 0 019.95 9" strokeLinecap="round" />
    </svg>
  );
}

function Waveform({ level }) {
  const bars = Array.from({ length: 15 });
  return (
    <div className="h-8 flex items-center gap-0.5">
      {bars.map((_, i) => {
        const base = 6 + Math.abs(Math.sin(i)) * 10;
        const h = Math.max(4, Math.min(28, base + level * 24));
        return (
          <span
            key={i}
            className="w-[3px] rounded-full bg-amber-400 transition-all duration-100"
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}

function ScoreRing({ value }) {
  return (
    <div className="w-16 h-16 rounded-full border-4 border-primary flex flex-col items-center justify-center">
      <span className="text-lg font-heading font-bold text-primary-dark leading-none">
        {value}
      </span>
    </div>
  );
}

function ScoreTag({ label, value, max }) {
  // Thang /25: >=20 tốt (xanh), >=15 khá (vàng), còn lại cần cố gắng (đỏ).
  const tone =
    value >= 20
      ? "border-green-300 bg-green-50 text-green-700"
      : value >= 15
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-red-300 bg-red-50 text-red-700";

  return (
    <div
      className={
        "flex flex-col items-center justify-start rounded-xl border-2 px-1.5 py-2 " +
        tone
      }
    >
      <span className="text-[11px] text-gray-500 leading-tight whitespace-nowrap">
        {label}
      </span>
      <span className="text-lg font-heading font-bold leading-tight mt-0.5">
        {value}
        {max && (
          <span className="text-xs font-normal text-gray-400">/{max}</span>
        )}
      </span>
    </div>
  );
}

function WarnIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="3 9 3 15 8 15 13 20 13 4 8 9 3 9" />
      <path d="M16 8a5 5 0 010 8M19 5a9 9 0 010 14" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0014 0v-1M12 18v3" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
