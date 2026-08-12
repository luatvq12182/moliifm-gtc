import { useEffect, useRef, useState } from "react";
import {
  assessPronunciation,
  pinyinWithToneMarks,
} from "../lib/iflytekSpeech.js";
import { startMicLevelMeter } from "../lib/micLevel.js";

function charColor(ok) {
  return ok
    ? "text-green-700 bg-green-50 border-green-200"
    : "text-red-700 bg-red-50 border-red-200";
}

// Modal luyện nói tập trung cho 1 câu — mở ra khi bấm vào 1 dòng trong
// SpeakingSection. results/onSaveResult do component cha (SpeakingSection)
// quản lý, để tiến độ vẫn giữ nguyên khi đóng/mở modal qua lại giữa các câu.
export default function SpeakingPracticeModal({
  open,
  dialogue,
  currentIndex,
  results,
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
  const stopMeterRef = useRef(null);
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
      if (stopMeterRef.current) stopMeterRef.current();
      if (sessionRef.current) sessionRef.current.stop();
    };
  }, []);

  if (!open || !line) return null;

  const startRecording = async () => {
    setPhase("listening");
    setErrorMsg("");
    stopMeterRef.current = startMicLevelMeter(setLevel);

    const session = assessPronunciation(line.hanzi);
    sessionRef.current = session;

    try {
      const result = await session.result;
      onSaveResult(currentIndex, result);
      setPhase("result");
    } catch (e) {
      setErrorMsg(typeof e === "string" ? e : "Có lỗi xảy ra, thử lại nhé.");
      setPhase("error");
    } finally {
      sessionRef.current = null;
      if (stopMeterRef.current) {
        stopMeterRef.current();
        stopMeterRef.current = null;
      }
      setLevel(0);
    }
  };

  // Người dùng chủ động bấm "Dừng" — ép phiên nhận diện kết thúc ngay với
  // phần đã thu được (thay vì chờ Azure tự phát hiện im lặng, thứ đôi khi
  // không xảy ra và gây đơ).
  const stopRecording = () => {
    if (sessionRef.current) sessionRef.current.stop();
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

          {phase === "result" && existingResult && (
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

              {existingResult.chars?.length > 0 && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-1.5">
                    Chi tiết từng chữ:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {existingResult.chars.map((c, i) => (
                      <div
                        key={i}
                        className={
                          "flex flex-col items-center px-2.5 py-1.5 rounded-lg border " +
                          charColor(c.ok)
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
                          <span className="text-[9px] font-medium leading-tight mt-0.5 text-red-600">
                            {c.issue}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === "error" && (
            <p className="text-sm text-red-600 mt-4">{errorMsg}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          {phase === "listening" ? (
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
          ) : (
            <button
              onClick={startRecording}
              className="w-full py-3 rounded-2xl font-medium bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white flex items-center justify-center gap-2"
            >
              <MicIcon />
              {phase === "result" ? "Luyện lại câu này" : "Bấm để bắt đầu nói"}
            </button>
          )}

          {phase !== "listening" && (
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
