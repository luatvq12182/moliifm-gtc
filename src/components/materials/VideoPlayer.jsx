import { useCallback, useEffect, useRef, useState } from "react";
import AuthImage from "./AuthImage.jsx";

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

// Nạp thư viện trình phát của YouTube một lần cho cả trang.
let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        ytApiPromise = null;
        s.remove();
        reject(new Error("Không tải được trình phát YouTube"));
      };
      document.head.appendChild(s);
    });
  }
  return ytApiPromise;
}

/**
 * Trình phát video bài giảng (video để "Không công khai" trên YouTube).
 *
 * Khách chấp nhận video YouTube có thể bị chia sẻ, nhưng muốn site chặn hết
 * mức có thể. Những gì làm ở đây:
 *
 *  - Tắt hết giao diện của YouTube (controls=0) và dùng nút điều khiển riêng.
 *  - Phủ một lớp trong suốt lên khung YouTube: không bấm được vào tiêu đề /
 *    logo để mở youtube.com (chỗ dễ lấy link nhất), không chuột phải được.
 *  - Trước khi phát và khi phát hết: che khung YouTube bằng ảnh bìa của mình
 *    (không hiện tên kênh, "video khác" của YouTube).
 *  - Toàn màn hình là toàn màn hình của KHUNG NÀY (lớp che vẫn nằm trên),
 *    không phải toàn màn hình của YouTube.
 * Người cố tình (mở công cụ lập trình, quay màn hình) vẫn lấy được — đã báo khách.
 *
 * @param youtubeId   mã video
 * @param thumbPath   đường dẫn API ảnh bìa (rỗng = nền đen)
 * @param startAt     giây bắt đầu — chỗ học viên đang xem dở (0 = từ đầu)
 * @param onProgress  ({ position, duration, ended }, { keepalive }) — báo chỗ
 *                    đang xem: mỗi 10 giây khi đang phát, khi dừng, khi hết,
 *                    khi rời trang. Bỏ trống = không báo (admin xem trước).
 * @param onDuration  (giây) — gọi một lần khi biết thời lượng video.
 */
export default function VideoPlayer({ youtubeId, title = "", thumbPath = "", startAt = 0, onProgress, onDuration }) {
  const boxRef = useRef(null);
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const startedRef = useRef(false); // đã phát lần nào chưa — chưa phát thì không báo tiến độ (kẻo ghi đè chỗ đang xem dở bằng 0)
  const lastSentRef = useRef(-1);
  const onProgressRef = useRef(onProgress);
  const startAtRef = useRef(startAt);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);
  const onDurationRef = useRef(onDuration);
  useEffect(() => {
    onDurationRef.current = onDuration;
  }, [onDuration]);

  const [ready, setReady] = useState(false);
  const [state, setState] = useState(-1);
  const [time, setTime] = useState(Math.floor(startAt) || 0);
  const [dragTime, setDragTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [started, setStarted] = useState(false);
  const [full, setFull] = useState(false);
  const [controlsShown, setControlsShown] = useState(true);
  const [needTap, setNeedTap] = useState(false);
  const [error, setError] = useState(null);

  const playing = state === 1 || state === 3;
  const ended = state === 0;

  const report = useCallback((extra = {}, opts = {}) => {
    const p = playerRef.current;
    if (!p || !startedRef.current || !onProgressRef.current) return;
    const position = p.getCurrentTime?.() || 0;
    const dur = p.getDuration?.() || 0;
    if (!extra.ended && Math.abs(position - lastSentRef.current) < 1) return;
    lastSentRef.current = position;
    onProgressRef.current({ position, duration: dur, ...extra }, opts);
  }, []);

  // Dựng trình phát YouTube. Khung <div> cho YouTube tạo bằng tay (không do
  // React quản) vì YouTube thay nó bằng <iframe>.
  useEffect(() => {
    let cancelled = false;
    let player = null;
    const host = document.createElement("div");
    mountRef.current?.appendChild(host);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player = new YT.Player(host, {
          host: "https://www.youtube-nocookie.com",
          videoId: youtubeId,
          width: "100%",
          height: "100%",
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            cc_load_policy: 0,
            modestbranding: 1,
            start: Math.floor(startAtRef.current) || undefined,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              setReady(true);
              setDuration(player.getDuration() || 0);
              setMuted(player.isMuted());
              setVolume(player.getVolume());
            },
            onStateChange: (e) => {
              if (cancelled) return;
              if (e.data === 1) {
                startedRef.current = true;
                setStarted(true);
                setNeedTap(false);
              }
              setState(e.data);
            },
            onPlaybackRateChange: (e) => !cancelled && setSpeed(e.data),
            onError: (e) => !cancelled && setError(e.data),
          },
        });
      })
      .catch(() => !cancelled && setError("load"));
    return () => {
      cancelled = true;
      report({}, { keepalive: true });
      try {
        player?.destroy();
      } catch {
        // trình phát chưa dựng xong
      }
      playerRef.current = null;
      host.remove();
    };
  }, [youtubeId, report]);

  const durationKnown = duration > 0;
  useEffect(() => {
    if (durationKnown) onDurationRef.current?.(playerRef.current?.getDuration?.() || 0);
  }, [durationKnown]);

  // Đọc thời gian đang phát.
  useEffect(() => {
    if (!ready) return undefined;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      setTime(p.getCurrentTime() || 0);
      const d = p.getDuration() || 0;
      if (d) setDuration(d);
    }, 250);
    return () => clearInterval(id);
  }, [ready]);

  // Trạng thái phát đổi -> báo tiến độ.
  useEffect(() => {
    if (state === 2) report();
    if (state === 0) report({ ended: true });
    if (state !== 1) return undefined;
    const id = setInterval(() => report(), 10000);
    return () => clearInterval(id);
  }, [state, report]);

  // Rời trang / chuyển tab / khoá máy -> lưu ngay.
  useEffect(() => {
    const flush = () => report({}, { keepalive: true });
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [report]);

  const play = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    p.playVideo();
    // Một số trình duyệt điện thoại (Safari iPhone) chỉ cho phát khi chạm thẳng
    // vào khung YouTube -> không phát được thì tạm bỏ lớp che để học viên chạm.
    if (!startedRef.current) {
      setTimeout(() => {
        const s = playerRef.current?.getPlayerState?.();
        if (!startedRef.current && s !== 1 && s !== 3) setNeedTap(true);
      }, 1500);
    }
  }, []);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const s = p.getPlayerState();
    if (s === 1 || s === 3) p.pauseVideo();
    else play();
  }, [play]);

  const seekTo = useCallback((sec, commit = true) => {
    const p = playerRef.current;
    if (!p) return;
    const d = p.getDuration() || 0;
    const t = Math.max(0, d ? Math.min(sec, d - 0.5) : sec);
    p.seekTo(t, commit);
    setTime(t);
  }, []);

  const seekBy = useCallback((delta) => seekTo((playerRef.current?.getCurrentTime() || 0) + delta), [seekTo]);

  const restart = () => {
    seekTo(0);
    play();
  };

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  }, []);

  const changeVolume = (v) => {
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(v);
    setVolume(v);
    if (v > 0 && p.isMuted()) {
      p.unMute();
      setMuted(false);
    }
  };

  // Toàn màn hình: phủ kín cửa sổ bằng CSS (chạy cả trên iPhone, nơi khung
  // thường không vào được chế độ toàn màn hình), cộng toàn màn hình thật nếu có.
  const enterFull = useCallback(() => {
    setFull(true);
    boxRef.current?.requestFullscreen?.().catch(() => {});
  }, []);
  const exitFull = useCallback(() => {
    setFull(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);
  const toggleFull = useCallback(() => (full ? exitFull() : enterFull()), [full, enterFull, exitFull]);

  useEffect(() => {
    const onChange = () => !document.fullscreenElement && setFull(false);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Phím tắt (bỏ qua khi đang gõ trong ô nhập).
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select, [contenteditable=true]")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === " " || key === "k") toggle();
      else if (key === "arrowleft") seekBy(-5);
      else if (key === "arrowright") seekBy(5);
      else if (key === "j") seekBy(-10);
      else if (key === "l") seekBy(10);
      else if (key === "f") toggleFull();
      else if (key === "m") toggleMute();
      else if (key === "escape" && full) exitFull();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seekBy, toggleFull, toggleMute, exitFull, full]);

  // Đang phát mà không đụng chuột một lúc -> ẩn thanh điều khiển + con trỏ.
  const hideTimer = useRef(null);
  const poke = useCallback(() => {
    setControlsShown(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsShown(false), 2500);
  }, []);
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  const showControls = !playing || controlsShown;

  const shown = dragTime ?? time;
  const resumeAt = Math.floor(startAt) || 0;

  return (
    <div
      ref={boxRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={poke}
      onTouchStart={poke}
      className={"select-none " + (full ? "fixed inset-0 z-[100] bg-black" : "relative")}
      style={full && !showControls ? { cursor: "none" } : undefined}
    >
      <div className={"relative bg-black overflow-hidden " + (full ? "w-full h-full" : "aspect-video rounded-xl")}>
        <div ref={mountRef} className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full" />

        {/* Lớp chặn bấm vào khung YouTube. Bấm = phát / dừng, bấm đúp = toàn màn hình. */}
        {!needTap && <div className="absolute inset-0" onClick={toggle} onDoubleClick={toggleFull} />}
        {/* Trình duyệt bắt chạm thẳng vào YouTube: chỉ chừa ô giữa (nút ▶ của
            YouTube); tiêu đề, tên kênh, nút "Xem trên YouTube" vẫn bị che. */}
        {needTap && (
          <>
            <div className="absolute inset-x-0 top-0 h-[32%]" />
            <div className="absolute inset-x-0 bottom-0 h-[32%]" />
            <div className="absolute left-0 top-[32%] bottom-[32%] w-[32%]" />
            <div className="absolute right-0 top-[32%] bottom-[32%] w-[32%]" />
          </>
        )}


        {/* Chưa phát lần nào: ảnh bìa + nút phát (che tên kênh, link YouTube). */}
        {!started && !needTap && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black cursor-pointer" onClick={play}>
            {thumbPath && <AuthImage path={thumbPath} alt={title} className="absolute inset-0 w-full h-full opacity-60" />}
            <div className="relative flex flex-col items-center gap-3 px-4 text-center">
              <button
                type="button"
                onClick={play}
                disabled={!ready}
                aria-label="Phát"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary hover:bg-primary-dark text-gray-900 flex items-center justify-center shadow-lg disabled:opacity-60"
              >
                {ready ? <PlayIcon size={34} /> : <span className="w-7 h-7 rounded-full border-[3px] border-gray-900/30 border-t-gray-900 animate-spin" />}
              </button>
              {resumeAt > 0 ? (
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <button type="button" onClick={play} disabled={!ready} className="px-3 py-1.5 rounded-full bg-white text-gray-900 font-medium">
                    Xem tiếp từ {formatTime(resumeAt)}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      restart();
                    }}
                    disabled={!ready}
                    className="px-3 py-1.5 rounded-full bg-black/50 text-white border border-white/40"
                  >
                    Xem từ đầu
                  </button>
                </div>
              ) : (
                duration > 0 && <span className="text-sm text-white/90 drop-shadow">{formatTime(duration)}</span>
              )}
            </div>
          </div>
        )}

        {needTap && (
          <p className="absolute top-3 inset-x-0 mx-auto w-max max-w-[90%] text-center text-xs sm:text-sm bg-black/70 text-white rounded-full px-3 py-1.5 pointer-events-none">
            Chạm vào video để bắt đầu phát
          </p>
        )}

        {/* Tạm dừng: YouTube hiện tiêu đề + tên kênh ở mép trên -> che bằng dải
            tối mang tên video của site. */}
        {started && !playing && !ended && !error && (
          <div
            className="absolute inset-x-0 top-0 h-[28%] min-h-[64px] pointer-events-none"
            style={{ background: "linear-gradient(to bottom, #000 0%, #000 58%, transparent 100%)" }}
          >
            <p className="px-4 pt-3 text-white text-sm sm:text-base font-medium line-clamp-1">{title}</p>
          </div>
        )}

        {/* Phát hết: che màn "video khác" của YouTube. */}
        {ended && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 text-white">
            <p className="text-base sm:text-lg font-medium">Bạn đã xem hết video</p>
            <button type="button" onClick={restart} className="px-4 py-2 rounded-full bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium">
              Xem lại từ đầu
            </button>
          </div>
        )}

        {error !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black text-white text-sm text-center px-6">
            {error === "load"
              ? "Không tải được trình phát video. Kiểm tra kết nối mạng rồi tải lại trang."
              : `Video này tạm thời không phát được (mã ${error}). Vui lòng báo trung tâm.`}
          </div>
        )}

        {/* Thanh điều khiển */}
        {started && !error && (
          <div
            className={
              "absolute inset-x-0 bottom-0 px-3 pt-8 pb-2 text-white transition-opacity " +
              (showControls ? "opacity-100" : "opacity-0 pointer-events-none")
            }
            // Tạm dừng: nền đặc hơn để che nút "Video khác" / logo YouTube ở mép dưới.
            style={{
              background: playing
                ? "linear-gradient(to top, rgba(0,0,0,.8), rgba(0,0,0,.4) 60%, transparent)"
                : "linear-gradient(to top, #000 0%, #000 62%, transparent)",
            }}
          >
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.floor(duration))}
              step={1}
              value={Math.min(Math.floor(shown), Math.floor(duration) || 0)}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDragTime(v);
                seekTo(v, false);
              }}
              onPointerUp={(e) => {
                seekTo(Number(e.currentTarget.value));
                setDragTime(null);
              }}
              onKeyUp={(e) => {
                seekTo(Number(e.currentTarget.value));
                setDragTime(null);
              }}
              aria-label="Tua video"
              className="w-full h-1.5 accent-amber-400 cursor-pointer block"
            />
            <div className="flex items-center gap-1 sm:gap-2 mt-1.5">
              <CtrlButton label={playing ? "Dừng (phím K)" : "Phát (phím K)"} onClick={toggle}>
                {playing ? <PauseIcon /> : <PlayIcon size={20} />}
              </CtrlButton>
              <CtrlButton label="Lùi 10 giây (phím J)" onClick={() => seekBy(-10)}>
                <SkipIcon dir="back" />
              </CtrlButton>
              <CtrlButton label="Tới 10 giây (phím L)" onClick={() => seekBy(10)}>
                <SkipIcon dir="fwd" />
              </CtrlButton>
              <span className="text-xs sm:text-sm tabular-nums whitespace-nowrap px-1">
                {formatTime(shown)} / {formatTime(duration)}
              </span>
              <span className="flex-1" />
              <select
                value={speed}
                onChange={(e) => playerRef.current?.setPlaybackRate(Number(e.target.value))}
                aria-label="Tốc độ phát"
                title="Tốc độ phát"
                className="bg-black/40 border border-white/30 rounded-md text-xs sm:text-sm px-1.5 py-1 text-white"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s} className="text-gray-900">
                    {s === 1 ? "1x" : `${s}x`}
                  </option>
                ))}
              </select>
              <CtrlButton label={muted ? "Bật tiếng (phím M)" : "Tắt tiếng (phím M)"} onClick={toggleMute}>
                <VolumeIcon off={muted || volume === 0} />
              </CtrlButton>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Âm lượng"
                className="hidden sm:block w-20 h-1 accent-white cursor-pointer"
              />
              <CtrlButton label={full ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình (phím F)"} onClick={toggleFull}>
                <FullscreenIcon exit={full} />
              </CtrlButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CtrlButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center hover:bg-white/15"
    >
      {children}
    </button>
  );
}

function PlayIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function SkipIcon({ dir }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === "back" ? <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" /> : <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />}
      <text x="12" y="15.5" textAnchor="middle" fontSize="7.5" fill="currentColor" stroke="none" fontWeight="700">
        10
      </text>
    </svg>
  );
}

function VolumeIcon({ off }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" />
      {off ? <path d="m23 9-6 6M17 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
    </svg>
  );
}

function FullscreenIcon({ exit }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={exit ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"} />
    </svg>
  );
}
