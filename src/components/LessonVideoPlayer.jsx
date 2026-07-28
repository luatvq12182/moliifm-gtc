import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { loadYoutubeApi } from "../lib/loadYoutubeApi.js";
import { resolveUploadUrl } from "../lib/mediaUrl.js";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

const LessonVideoPlayer = forwardRef(function LessonVideoPlayer(
  {
    videoType = "upload",
    videoSrc,
    youtubeId,
    dialogue,
    onEnded,
    onActiveLineChange,
  },
  ref,
) {
  const isYoutube = videoType === "youtube";

  const videoElRef = useRef(null);
  const ytContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytIntervalRef = useRef(null);
  const segmentEndRef = useRef(null);

  const [speed, setSpeed] = useState(1);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDetails, setShowDetails] = useState(false);
  const [ytReady, setYtReady] = useState(false);

  useEffect(() => {
    if (!isYoutube || !youtubeId) return;

    let destroyed = false;
    setYtReady(false);

    loadYoutubeApi().then((YT) => {
      if (destroyed || !ytContainerRef.current) return;
      ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
        videoId: youtubeId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => setYtReady(true),
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED && onEnded) onEnded();
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
      if (ytPlayerRef.current?.destroy) ytPlayerRef.current.destroy();
      ytPlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYoutube, youtubeId]);

  useEffect(() => {
    if (!isYoutube || !ytReady) return;

    ytIntervalRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || typeof player.getCurrentTime !== "function") return;
      handleTimeUpdate(player.getCurrentTime());
    }, 250);

    return () => clearInterval(ytIntervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYoutube, ytReady]);

  const handleTimeUpdate = (currentTime) => {
    if (segmentEndRef.current != null && currentTime >= segmentEndRef.current) {
      pauseInternal();
      segmentEndRef.current = null;
    }

    const idx = dialogue.findIndex(
      (line) => currentTime >= line.startTime && currentTime < line.endTime,
    );
    setActiveIndex((prev) => {
      if (idx !== prev) {
        onActiveLineChange && onActiveLineChange(idx);
        return idx;
      }
      return prev;
    });
  };

  const pauseInternal = () => {
    if (isYoutube) ytPlayerRef.current?.pauseVideo();
    else videoElRef.current?.pause();
  };

  useImperativeHandle(ref, () => ({
    playSegment(start, end) {
      segmentEndRef.current = typeof end === "number" ? end : null;

      if (isYoutube) {
        const player = ytPlayerRef.current;
        if (!player) return;
        player.seekTo(start || 0, true);
        player.playVideo();
      } else {
        const v = videoElRef.current;
        if (!v) return;
        const seekAndPlay = () => {
          v.currentTime = start || 0;
          v.play();
        };
        if (v.readyState >= 1) seekAndPlay();
        else v.addEventListener("loadedmetadata", seekAndPlay, { once: true });
      }
    },
  }));

  const changeSpeed = (s) => {
    setSpeed(s);
    if (isYoutube) ytPlayerRef.current?.setPlaybackRate(s);
    else if (videoElRef.current) videoElRef.current.playbackRate = s;
  };

  const handleVideoTimeUpdate = () => {
    const v = videoElRef.current;
    if (!v) return;
    handleTimeUpdate(v.currentTime);
  };

  const activeLine = activeIndex >= 0 ? dialogue[activeIndex] : null;

  return (
    <div>
      <div className="relative rounded-lg overflow-hidden bg-black mb-3 aspect-video">
        {/* Luôn render CẢ HAI thẻ, chỉ ẩn/hiện bằng class "hidden" — không
            bao giờ để React gỡ bỏ hẳn node <div> chứa YouTube khỏi DOM, vì
            YouTube IFrame API tự thay thế div đó bằng iframe (React không
            biết), gỡ node theo kiểu cũ (if/else) làm React bị lệch giữa cây
            DOM nó nhớ và DOM thật, gây lỗi removeChild khi chuyển qua lại
            giữa video YouTube và video tự host. */}
        <div
          ref={ytContainerRef}
          className={"w-full h-full " + (isYoutube ? "" : "hidden")}
        />
        <video
          ref={videoElRef}
          src={isYoutube ? undefined : resolveUploadUrl(videoSrc)}
          controls
          controlsList="nodownload"
          playsInline
          webkit-playsinline="true"
          className={"w-full h-full " + (isYoutube ? "hidden" : "")}
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={onEnded}
        >
          Trình duyệt của bạn không hỗ trợ thẻ video.
        </video>

        {activeLine && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-3 pointer-events-none">
            <p className="text-white text-center font-medium text-base sm:text-lg leading-snug">
              {activeLine.hanzi}
            </p>
            {showDetails && (
              <>
                <p className="text-white/80 text-center text-xs sm:text-sm mt-1">
                  {activeLine.pinyin}
                </p>
                <p className="text-white/70 text-center text-xs mt-0.5">
                  {activeLine.vi}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">Tốc độ:</span>
        <select
          value={speed}
          onChange={(e) => changeSpeed(Number(e.target.value))}
          className="px-2 py-1 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-50"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
        {isYoutube && (
          <span className="text-[10px] text-gray-400">
            (YouTube chỉ hỗ trợ tới 2x)
          </span>
        )}

        <button
          onClick={() => setShowDetails((v) => !v)}
          className="ml-auto px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
        >
          {showDetails ? "Ẩn phiên âm & dịch" : "Hiện phiên âm & dịch"}
        </button>
      </div>
    </div>
  );
});

export default LessonVideoPlayer;
