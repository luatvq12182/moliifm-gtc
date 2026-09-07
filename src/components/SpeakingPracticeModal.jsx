import { useEffect, useRef, useState } from "react";
import {
  assessPronunciation,
  pinyinWithToneMarks,
} from "../lib/iflytekSpeech.js";
import {
  speakChinese,
  prefetchChinese,
  stopSpeaking,
  isSpeechSupported,
} from "../lib/speak.js";
import { playSegment, stopSegment } from "../lib/audioSegment.js";

// Tô màu ô chữ theo BA MỨC, không phải đúng/sai nhị phân.
//
// Mức lấy từ `level` do máy chủ suy ra từ perr_level_msg của iFLYTEK — một
// thuộc tính không có trong tài liệu nhưng xuất hiện trên mọi phone với giá
// trị 1-3 (xem ghi chú trong gtc-api/src/lib/iflytek.js):
//
//   good — đọc chuẩn
//   fair — hơi lệch: hoặc iFLYTEK vẫn tính là đúng nhưng chấm mức 2, hoặc có
//          lỗi nhưng ở mức biên (vd. 卫 sai vận mẫu mức 2)
//   weak — sai rõ rệt (vd. 好 sai mức 3)
//
// Điểm quan trọng: chữ nào iFLYTEK bảo đúng thì cao nhất chỉ tới 'fair', không
// bao giờ thành 'weak' — ta không tự tạo ra lỗi mới mà máy chấm không báo.
//
// TOÀN BỘ việc xếp mức do MÁY CHỦ quyết, frontend chỉ tô màu theo `level`.
//
// Trước đây ở đây còn một bảng RHYTHM_ISSUES tự ghi đè: hễ nhãn là "đọc thừa /
// đọc thiếu / đọc lặp" thì tô vàng, bất kể máy chủ nói gì. Đó là tàn dư từ thời
// chưa có `level`, và nó gây mâu thuẫn thật: máy chủ xếp "đọc thiếu" là NẶNG
// (bỏ hẳn một chữ) nên chip từ 大卫 hiện ĐỎ, còn hai chữ 大 卫 bên trong lại
// hiện VÀNG do bảng này ghi đè.
//
// Quy tắc: chỉ một nơi được quyết định mức. Nơi đó là lib/iflytek.js ở máy chủ.

const LEVEL_STYLE = {
  good: {
    box: "text-green-700 bg-green-50 border-green-200",
    label: "text-green-600",
  },
  fair: {
    box: "text-amber-700 bg-amber-50 border-amber-200",
    label: "text-amber-600",
  },
  weak: {
    box: "text-red-700 bg-red-50 border-red-200",
    label: "text-red-600",
  },
};

// Chỉ lấy MÀU CHỮ theo mức của riêng chữ đó — dùng để tô từng chữ bên trong
// một cụm từ, nên không kèm nền hay viền.
const CHAR_TEXT_COLOR = {
  good: "text-green-700",
  fair: "text-amber-700",
  weak: "text-red-600",
};

function charTextColor(c) {
  if (c.level && CHAR_TEXT_COLOR[c.level]) return CHAR_TEXT_COLOR[c.level];
  return c.ok ? CHAR_TEXT_COLOR.good : CHAR_TEXT_COLOR.weak;
}

// Tô từng chữ trong một cụm theo mức của chính nó.
//
// VÌ SAO: một TỪ được xếp loại theo âm tiết TỆ NHẤT (xem wordFeedback.js) — đó
// là chủ ý, để một lỗi thật không bị chữ đúng bên cạnh pha loãng. Nhưng nếu tô
// đỏ đặc cả cụm thì học viên tưởng cả ba chữ đều sai, trong khi thực tế chỉ có
// một chữ hỏng. Viền nói "cụm này cần luyện", màu từng chữ nói "hỏng ở đâu".
function WordChars({ word }) {
  if (!Array.isArray(word.chars) || word.chars.length === 0) {
    return <span>{word.content}</span>; // bản ghi cũ chưa có chars
  }
  return (
    <>
      {word.chars.map((c, i) => (
        <span key={i} className={charTextColor(c)}>
          {c.content}
        </span>
      ))}
    </>
  );
}

function charStyle(c) {
  // Bản ghi cũ chưa có `level` -> lùi về đúng/sai nhị phân như trước.
  if (c.level && LEVEL_STYLE[c.level]) return LEVEL_STYLE[c.level];
  return c.ok ? LEVEL_STYLE.good : LEVEL_STYLE.weak;
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

  // Azure TTS chỉ chạy khi đã cấu hình key. Chưa có thì ẩn hẳn nút nghe đi,
  // thay vì để học viên bấm vào một nút không làm gì.
  const canSpeak = isSpeechSupported();

  const line = dialogue[currentIndex];
  const existingResult = results[currentIndex];
  const total = dialogue.length;
  const attemptedCount = Object.keys(results).length;

  useEffect(() => {
    setShowPinyin(false);
    setShowTranslation(false);
    setErrorMsg("");
    setPhase(existingResult ? "result" : "idle");
    // Đổi câu -> cắt ngay mọi thứ đang phát, tránh cảnh nghe giọng của câu
    // trước trong khi màn hình đã hiện câu sau.
    stopSegment();
    stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, open]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) sessionRef.current.stop();
      stopSegment();
      stopSpeaking();
    };
  }, []);

  // Từ đang cần luyện là nút học viên nhiều khả năng bấm nhất. Tổng hợp sẵn
  // audio cho nó ngay khi kết quả hiện ra, để cú bấm đầu tiên phát tức thì
  // thay vì đứng chờ Azure ~1 giây.
  const focusWordContent = existingResult?.focusWord?.content;
  const focusWordPinyin = existingResult?.focusWord?.pinyin;
  useEffect(() => {
    if (focusWordContent) prefetchChinese(focusWordContent, focusWordPinyin);
  }, [focusWordContent, focusWordPinyin]);

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

          {showPinyin && (
            <p className="text-sm text-gray-500 mt-1.5">{line.pinyin}</p>
          )}
          {/* Icon loa NGAY CẠNH câu mẫu, luôn hiện.
              Nút "Câu mẫu" ở khối kết quả chỉ xuất hiện SAU khi đã chấm, nên
              nếu chỉ có nó thì lúc mới mở popup học viên không có cách nào nghe
              mẫu trước khi đọc. */}
          {/* Bọc trong div KHỐI: nhãn "LUYỆN NÓI" phía trên là thẻ span inline,
              nếu để thẻ câu mẫu là inline-flex thì hai thứ bị hút lên cùng dòng. */}
          <div className="mt-1.5 flex items-start justify-center gap-2 flex-wrap">
            <p className="text-2xl font-medium">{line.hanzi}</p>
            <button
              onClick={() =>
                onRequestPlaySegment(
                  line.videoIndex,
                  line.startTime,
                  line.endTime,
                )
              }
              title="Nghe câu mẫu"
              className="shrink-0 w-8 h-8 mt-1 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100"
            >
              <SpeakerIcon />
            </button>
          </div>
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
              <ScoreSummary
                score={existingResult.pronScore}
                feedback={existingResult.feedback}
                parts={{
                  accuracy: existingResult.accuracy,
                  prosody: existingResult.prosody,
                  fluency: existingResult.fluency,
                  completeness: existingResult.completeness,
                }}
              />

              {/* Câu mà máy nhận dạng nghe được — ĐỂ NGOÀI, không giấu trong
                  phần thu gọn. Đây là bằng chứng ĐỘC LẬP duy nhất trong toàn bộ
                  màn hình: bộ chấm điểm biết trước câu mẫu nên luôn cố khớp vào
                  đó, còn bộ nhận dạng thì không biết gì, nghe sao ghi vậy. Học
                  viên đối chiếu dòng này với câu mẫu là thấy ngay mình đọc chệch
                  chỗ nào. */}
              <div className="mb-3">
                <p className="text-[11px] text-gray-400 mb-1">
                  Máy nghe bạn đọc thành:
                </p>
                <p className="text-base text-gray-800 bg-white rounded-lg border border-gray-200 px-3 py-2 text-left">
                  {existingResult.spokenText || "— không nghe rõ —"}
                </p>
              </div>

              {/* Máy nhận dạng nghe ra chữ khác so với câu mẫu.
                  Hiện MỌI KHI vượt dung sai, không chỉ khi điểm bị hạ: đã có ca
                  trần bằng đúng điểm gốc nên không hạ được gì, mà học viên vẫn
                  cần biết mình đã đọc chệch ba chữ. */}
              {existingResult.spokenMismatch && existingResult.spokenMatch && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-3">
                  <span className="text-red-500 shrink-0 mt-0.5">
                    <WarnIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-red-800 leading-snug">
                      Máy chỉ nghe ra đúng{" "}
                      <strong>
                        {existingResult.spokenMatch.matched}/
                        {existingResult.spokenMatch.total}
                      </strong>{" "}
                      chữ của câu mẫu.
                      {existingResult.spokenMatch.missedText && (
                        <>
                          {" "}
                          Các chữ{" "}
                          <strong>
                            {existingResult.spokenMatch.missedText}
                          </strong>{" "}
                          bị đọc chệch sang âm khác.
                        </>
                      )}
                    </p>
                    {/* KHÔNG nói ra chuyện điểm bị giới hạn từ X xuống Y.
                        Phơi cơ chế chấm ra như vậy chỉ mời gọi tranh cãi về con
                        số, trong khi thứ học viên cần là biết chữ nào đọc sai. */}
                    <p className="text-[11px] text-red-600 mt-1">
                      Hãy nghe lại câu mẫu và đọc kỹ những chữ này nhé.
                    </p>
                  </div>
                </div>
              )}

              {/* CÁCH CHỈ LỖI THEO TỪ (thay cho theo từng chữ rời).
                  Chấm từng chữ tuy chi tiết nhưng báo sai oan rất nhiều, dồn
                  vào âm tiết thanh nhẹ. Máy chủ gom chữ thành từ dựa vào phiên
                  âm câu mẫu — xem gtc-api/src/lib/wordFeedback.js. */}
              {existingResult.words?.length > 0 && (
                <div className="mb-3">
                  <WordChipRow
                    words={existingResult.words}
                    compounds={existingResult.compounds}
                    canSpeak={canSpeak}
                  />
                </div>
              )}

              {/* Chỉ nêu ĐÚNG MỘT từ đáng luyện nhất. Đưa cùng lúc năm chỗ cần
                  sửa thì học viên không sửa chỗ nào cả. */}
              {/* SO SÁNH TỪNG CHỮ — giọng học viên với giọng chuẩn, cạnh nhau.
                  Chỉ liệt kê chữ có lỗi: đây là thứ cần luyện, không phải cả câu.
                  Đoạn ghi âm của từng chữ cắt theo mốc beg_pos/end_pos do iFLYTEK
                  trả về (xem gtc-api/src/lib/iflytek.js). */}
              <CompareList
                chars={existingResult.chars}
                audioBlob={existingResult.audioBlob}
                canSpeak={canSpeak}
              />

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
// Một TỪ trong câu. Màu theo mức độ, không phải đúng/sai nhị phân — vì ranh
// giới giữa "đọc được" và "đọc sai" vốn không dứt khoát.
//
// Bấm vào để nghe cách đọc chuẩn của riêng từ đó. Đây là yêu cầu của khách
// hàng: đọc sai từ nào thì nghe lại đúng từ ấy để luyện, thay vì phải nghe lại
// cả câu rồi tự dò xem chỗ nào sai.
// Xếp loại + một câu động viên theo mức điểm.
//
// Học viên cần biết NGAY "mình đang ở mức nào" trước khi đọc chi tiết lỗi. Con
// số trần trụi không trả lời được câu đó — 74 là tốt hay tệ?
const BANDS = [
  { min: 90, label: "Xuất sắc!", cheer: "Phát âm của bạn rất chuẩn, giữ nguyên nhé!" },
  { min: 75, label: "Tốt lắm!", cheer: "Chỉ còn vài chỗ nhỏ là chuẩn hẳn rồi." },
  { min: 60, label: "Khá rồi!", cheer: "Luyện thêm mấy chữ bên dưới là lên ngay thôi." },
  { min: 40, label: "Cần luyện thêm", cheer: "Đừng nản nhé, nghe lại rồi đọc theo vài lần là quen." },
  { min: 0, label: "Cùng luyện lại nào", cheer: "Nghe kỹ giọng mẫu rồi đọc chậm lại từng chữ nhé." },
];

function bandOf(score) {
  if (typeof score !== "number") return null;
  return BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];
}

// Khối tổng quan: điểm, xếp loại, lời động viên, và bốn tiêu chí ẨN ĐI.
//
// Bốn tiêu chí để mặc định đóng vì hai lý do: popup đang quá dài, và chúng
// KHÔNG cộng lại thành điểm tổng (iFLYTEK tính tổng bằng trọng số riêng) nên
// bày ra cạnh nhau chỉ khiến học viên thắc mắc sao không khớp.
function ScoreSummary({ score, feedback, parts }) {
  const [open, setOpen] = useState(false);
  const band = bandOf(score);

  return (
    <div className="text-center mb-3">
      <div className="flex flex-col items-center">
        <ScoreRing value={score} />
        {band && (
          <>
            <p className="text-base font-heading font-bold text-gray-800 mt-1.5">
              {band.label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{band.cheer}</p>
          </>
        )}
      </div>

      {feedback && (
        <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-2.5 text-left leading-snug">
          {feedback}
        </p>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-gray-400 underline mt-2"
      >
        {open ? "Ẩn điểm chi tiết" : "Xem điểm chi tiết"}
      </button>

      {open && (
        <div className="mt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <ScoreTag label="Phát âm" value={parts.accuracy} max={100} />
            <ScoreTag label="Thanh điệu" value={parts.prosody} max={100} />
            <ScoreTag label="Trôi chảy" value={parts.fluency} max={100} />
            <ScoreTag label="Đầy đủ" value={parts.completeness} max={100} />
          </div>
        </div>
      )}
    </div>
  );
}

// Danh sách các chữ đọc chưa đúng, mỗi chữ một hàng với hai nút nghe đối chiếu.
function CompareList({ chars, audioBlob, canSpeak }) {
  const all = chars || [];
  // Giữ lại VỊ TRÍ trong câu, để biết mốc của chữ liền trước/liền sau mà chặn
  // không cho đoạn cắt lấn sang chúng.
  const wrong = all
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => (c.level ? c.level !== "good" : !c.ok));
  if (wrong.length === 0) return null;

  // Không có mốc thời gian (bản ghi cũ) hoặc không có file ghi âm thì chỉ còn
  // nghe được giọng chuẩn — vẫn hữu ích, nhưng mất phần đối chiếu.
  const canCompare = Boolean(audioBlob);

  return (
    <div className="mb-3">
      <p className="text-[11px] font-medium tracking-wide text-gray-500 mb-1.5">
        NGHE LẠI TỪNG CHỮ ({wrong.length})
      </p>
      <div className="space-y-1.5">
        {wrong.map(({ c, i }) => (
          <CompareRow
            key={i}
            char={c}
            prevEndMs={all[i - 1]?.endMs}
            nextBegMs={all[i + 1]?.begMs}
            audioBlob={canCompare ? audioBlob : null}
            canSpeak={canSpeak}
          />
        ))}
      </div>
    </div>
  );
}

function CompareRow({ char: c, prevEndMs, nextBegMs, audioBlob, canSpeak }) {
  const [playing, setPlaying] = useState(""); // '' | 'mine' | 'model'
  const style = charStyle(c);
  const hasSegment =
    audioBlob && typeof c.begMs === "number" && typeof c.endMs === "number";

  const playMine = () => {
    stopSpeaking();
    playSegment(audioBlob, c.begMs, c.endMs, {
      prevEndMs,
      nextBegMs,
      onStart: () => setPlaying("mine"),
      onEnd: () => setPlaying(""),
    });
  };

  const playModel = () => {
    stopSegment();
    // Truyền phiên âm iFLYTEK vào để Azure đọc ĐÚNG thanh của chữ này TRONG CÂU
    // NÀY. Không truyền thì một chữ đứng lẻ được đọc theo thanh từ điển — 你
    // trong 你好 phải là ní (biến điệu) nhưng máy sẽ đọc nǐ. Xem lib/speak.js.
    speakChinese(c.content, {
      pinyin: c.pinyin,
      onStart: () => setPlaying("model"),
      onEnd: () => setPlaying(""),
    });
  };

  return (
    <div className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-200 px-2.5 py-2">
      <div
        className={
          "shrink-0 w-11 flex flex-col items-center py-1 rounded-lg border " +
          style.box
        }
      >
        <span className="text-lg font-medium leading-none">{c.content}</span>
        {c.pinyin && (
          <span className="text-[10px] leading-tight mt-0.5">
            {pinyinWithToneMarks(c.pinyin)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {c.issue && (
          <p className={"text-[11px] leading-tight mb-1.5 " + style.label}>
            {c.issue}
          </p>
        )}
        <div className="flex items-center gap-1.5">
          {hasSegment && (
            <CompareButton
              active={playing === "mine"}
              onClick={playMine}
              tone="bạn"
              label="Giọng bạn"
            />
          )}
          {canSpeak && (
            <CompareButton
              active={playing === "model"}
              onClick={playModel}
              tone="chuẩn"
              label="Đọc mẫu"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CompareButton({ active, onClick, tone, label }) {
  // Hai nút phải TRÔNG KHÁC NHAU rõ ràng, vì học viên sẽ bấm qua lại liên tục
  // và không được nhầm mình đang nghe giọng nào.
  const base =
    tone === "bạn"
      ? "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
      : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition " +
        base +
        (active ? " ring-2 ring-offset-1 ring-current" : "")
      }
    >
      <PlaySmallIcon />
      {label}
    </button>
  );
}

function SpeakerTinyIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <polygon points="4 9 4 15 8 15 13 20 13 4 8 9 4 9" fill="currentColor" />
      <path d="M17 9a4 4 0 010 6" strokeLinecap="round" />
    </svg>
  );
}

// Hàng ô chữ, có gộp thêm ô "cả từ" ở những chỗ phiên âm tách rời một từ ghép.
//
// YÊU CẦU CỦA KHÁCH: "cho thành 2 chữ riêng xong 1 từ ghép lại đầy đủ".
// Câu 您好！có phiên âm "Nín hǎo!" — hai token nên bị tách thành hai ô 您 | 好.
// Học viên cần luyện được từng chữ, NHƯNG cũng phải nghe được 您好 đọc liền,
// vì đó mới là cách người ta chào. Máy chủ dò từ ghép bằng từ điển và trả về
// `compounds` — xem gtc-api/src/lib/compoundWords.js.
function WordChipRow({ words, compounds, canSpeak }) {
  // Chuyển danh sách vùng thành danh sách phần tử để render tuần tự.
  const startsAt = new Map();
  (compounds || []).forEach((c) => startsAt.set(c.start, c));

  const items = [];
  let i = 0;
  while (i < words.length) {
    const compound = startsAt.get(i);
    // Chốt chặn: vùng vượt quá số ô (dữ liệu cũ, hoặc máy chủ và giao diện lệch
    // phiên bản) thì bỏ qua việc gộp chứ không cắt bừa mảng.
    if (compound && i + compound.span <= words.length) {
      items.push({
        key: "c" + i,
        compound,
        parts: words.slice(i, i + compound.span),
      });
      i += compound.span;
    } else {
      items.push({ key: "w" + i, word: words[i] });
      i += 1;
    }
  }

  return (
    <div className="flex flex-wrap justify-center items-center gap-1.5">
      {items.map((it) =>
        it.compound ? (
          <CompoundGroup
            key={it.key}
            compound={it.compound}
            parts={it.parts}
            canSpeak={canSpeak}
          />
        ) : (
          <WordChip key={it.key} word={it.word} canSpeak={canSpeak} />
        ),
      )}
    </div>
  );
}

// Các ô chữ rời của một từ ghép, đóng khung lại, kèm một ô nghe CẢ TỪ.
function CompoundGroup({ compound, parts, canSpeak }) {
  const [playing, setPlaying] = useState(false);

  return (
    <span className="inline-flex items-center gap-1 rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 px-1 py-0.5">
      {parts.map((w, i) => (
        <WordChip key={i} word={w} canSpeak={canSpeak} />
      ))}

      {canSpeak && (
        <button
          type="button"
          onClick={() =>
            speakChinese(compound.content, {
              pinyin: compound.pinyin,
              onStart: () => setPlaying(true),
              onEnd: () => setPlaying(false),
            })
          }
          title={`Nghe cả từ ${compound.content} đọc liền`}
          // Màu TRUNG TÍNH, cố ý khác hẳn xanh/vàng/đỏ của các ô chữ: ô này để
          // NGHE chứ không phải kết quả chấm, tô màu theo thang chấm sẽ khiến
          // học viên tưởng cả từ vừa bị chấm thêm một lần nữa.
          className={
            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 transition " +
            (playing
              ? "ring-2 ring-offset-1 ring-slate-400"
              : "hover:bg-slate-50")
          }
        >
          <span className="text-base font-medium leading-tight">
            {compound.content}
          </span>
          <span
            className={
              "text-[13px] leading-none transition-opacity " +
              (playing ? "opacity-100" : "opacity-45")
            }
          >
            <SpeakerTinyIcon />
          </span>
        </button>
      )}
    </span>
  );
}

function WordChip({ word, canSpeak }) {
  const [playing, setPlaying] = useState(false);

  // Nền để rất nhạt, gần trắng: màu của TỪNG CHỮ bên trong mới là thứ cần nổi.
  const tone =
    word.status === "good"
      ? "border-green-300 bg-green-50/40"
      : word.status === "fair"
        ? "border-amber-300 bg-amber-50/40"
        : "border-red-300 bg-red-50/40";

  const chip = (
    <>
      <span className="text-base font-medium leading-tight">
        <WordChars word={word} />
      </span>
      {canSpeak && (
        <span
          className={
            "text-[13px] leading-none transition-opacity " +
            (playing ? "opacity-100" : "opacity-45")
          }
        >
          <SpeakerTinyIcon />
        </span>
      )}
    </>
  );

  if (!canSpeak) {
    return (
      <span
        className={
          "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border " + tone
        }
      >
        {chip}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        speakChinese(word.content, {
          pinyin: word.pinyin,
          onStart: () => setPlaying(true),
          onEnd: () => setPlaying(false),
        })
      }
      title={`Nghe cách đọc từ ${word.content}`}
      className={
        "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border transition " +
        tone +
        (playing ? " ring-2 ring-offset-1 ring-amber-400" : " hover:brightness-95")
      }
    >
      {chip}
    </button>
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
        {typeof value === "number" ? value : "--"}
      </span>
    </div>
  );
}

function ScoreTag({ label, value, max }) {
  // Thang /100: >=80 tốt (xanh), >=60 khá (vàng), còn lại cần cố gắng (đỏ).
  // Ngưỡng cũ tính trên thang /25 (>=20 và >=15) — quy sang /100 là đúng hai
  // mốc này, nên mức khắt khe không đổi so với trước.
  const tone =
    typeof value !== "number"
      ? "border-gray-200 bg-gray-50 text-gray-400"
      : value >= 80
        ? "border-green-300 bg-green-50 text-green-700"
        : value >= 60
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
        {typeof value === "number" ? value : "--"}
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

function SpeakerIcon() {
  return (
    <svg
      width="16"
      height="16"
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
