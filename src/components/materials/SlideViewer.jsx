import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/apiClient.js";

/**
 * Trình xem slide — dùng chung cho học viên và admin (xem trước).
 *
 * KHÁCH YÊU CẦU: xem được trên web, KHÔNG tải được. Những gì làm được trên web:
 *  - Mỗi trang là ẢNH lấy qua API có đăng nhập + kiểm quyền, biến thành blob
 *    trong bộ nhớ. Không có đường dẫn ảnh nào để chia sẻ, file gốc (hay link
 *    Google Slides) không bao giờ xuống trình duyệt.
 *  - Chặn chuột phải, kéo-thả ảnh, nhấn giữ để lưu ảnh trên điện thoại.
 *  - Watermark tên + số điện thoại người xem đè lên slide: ai chụp màn hình
 *    rồi phát tán thì vẫn truy ra được.
 * KHÔNG chặn được chụp màn hình — không trang web nào chặn được.
 *
 * Hai chế độ: XEM (trong trang) và TRÌNH CHIẾU (toàn màn hình nền đen, bấm
 * slide để sang trang, thanh điều khiển tự ẩn).
 *
 * @param pages      [{ width, height }] — để giữ đúng tỉ lệ khung khi ảnh chưa tải
 * @param pagePath   (n) => đường dẫn API của ảnh trang n (đếm từ 1)
 * @param watermark  chuỗi đè lên slide (để trống = không đè)
 */
const IDLE_MS = 2500;

export default function SlideViewer({ pages, pagePath, watermark }) {
  const total = pages.length;
  const [index, setIndex] = useState(0);
  const [urls, setUrls] = useState({});
  const [failed, setFailed] = useState({});
  const [presenting, setPresenting] = useState(false);
  const [idle, setIdle] = useState(false);
  const stageRef = useRef(null);
  const loadingRef = useRef(new Set());
  const urlsRef = useRef({});
  const touchRef = useRef(null);
  const idleTimer = useRef(null);

  const load = useCallback(
    (i) => {
      if (i < 0 || i >= total || urlsRef.current[i] || loadingRef.current.has(i)) return;
      loadingRef.current.add(i);
      api
        .blob(pagePath(i + 1))
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          urlsRef.current[i] = url;
          setUrls((u) => ({ ...u, [i]: url }));
        })
        .catch(() => setFailed((f) => ({ ...f, [i]: true })))
        .finally(() => loadingRef.current.delete(i));
    },
    [total, pagePath],
  );

  // Tải trang đang xem + trang trước/sau (trình chiếu thì tải trước 2 trang)
  // để lật không phải chờ.
  useEffect(() => {
    load(index);
    load(index + 1);
    load(index - 1);
    if (presenting) load(index + 2);
  }, [index, load, presenting]);

  // Rời trang -> nhả hết ảnh trong bộ nhớ.
  useEffect(
    () => () => {
      Object.values(urlsRef.current).forEach((u) => URL.revokeObjectURL(u));
      clearTimeout(idleTimer.current);
    },
    [],
  );

  const go = useCallback((i) => setIndex(Math.max(0, Math.min(total - 1, i))), [total]);

  const exitPresenting = useCallback(() => {
    setPresenting(false);
    setIdle(false);
    clearTimeout(idleTimer.current);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  const startPresenting = () => {
    setPresenting(true);
    // Toàn màn hình thật nếu trình duyệt cho; Safari trên iPhone không cho phần
    // tử thường vào toàn màn hình -> vẫn trình chiếu bằng lớp phủ kín cửa sổ.
    stageRef.current?.requestFullscreen?.().catch(() => {});
  };

  // Thoát toàn màn hình bằng Esc của trình duyệt -> thoát luôn trình chiếu.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setPresenting((p) => (p ? false : p));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Phím tắt. Bỏ qua khi đang gõ trong ô nhập.
  useEffect(() => {
    const onKey = (e) => {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      if (["ArrowRight", "PageDown"].includes(e.key) || (presenting && e.key === " ")) {
        e.preventDefault();
        go(index + 1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        go(index - 1);
      } else if (presenting && e.key === "Home") go(0);
      else if (presenting && e.key === "End") go(total - 1);
      else if (presenting && e.key === "Escape") exitPresenting();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, presenting, total, exitPresenting]);

  // Trình chiếu: không đụng chuột một lúc thì ẩn thanh điều khiển + con trỏ.
  const wake = () => {
    if (!presenting) return;
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  };

  // Vuốt ngang trên điện thoại để lật trang.
  const onTouchStart = (e) => {
    touchRef.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchRef.current == null) return;
    const dx = e.changedTouches[0].clientX - touchRef.current;
    touchRef.current = null;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
  };

  // Trình chiếu: bấm 1/4 bên trái MÀN HÌNH để lùi, chỗ còn lại để tiến — như
  // PowerPoint. Tính theo cả màn hình chứ không theo khung slide: slide 4:3
  // trên màn 16:9 có viền đen hai bên, bấm vào viền cũng phải ăn.
  const onStageClick = (e) => {
    if (!presenting) return;
    go(index + (e.clientX < window.innerWidth / 4 ? -1 : 1));
  };

  if (total === 0) return null;
  const page = pages[index];
  const ratio = page.width && page.height ? page.width / page.height : 16 / 9;

  const slide = (
    <div
      className="relative mx-auto"
      style={
        presenting
          ? { aspectRatio: ratio, width: `min(100vw, calc(100vh * ${ratio}))` }
          : { aspectRatio: ratio, width: "100%" }
      }
    >
      {urls[index] ? (
        <img
          src={urls[index]}
          alt={`Trang ${index + 1}`}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none bg-white"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          {failed[index] ? "Không tải được trang này. Lật sang trang khác rồi quay lại thử." : "Đang tải trang..."}
        </div>
      )}

      {watermark && <Watermark text={watermark} />}

      {/* Chế độ xem: vùng bấm lật trang ở hai mép — tiện trên điện thoại. */}
      {!presenting && (
        <>
          <button
            type="button"
            aria-label="Trang trước"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="absolute left-0 inset-y-0 w-1/6 flex items-center justify-start pl-2 text-white/0 hover:text-white/90 disabled:hidden"
          >
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            aria-label="Trang sau"
            onClick={() => go(index + 1)}
            disabled={index === total - 1}
            className="absolute right-0 inset-y-0 w-1/6 flex items-center justify-end pr-2 text-white/0 hover:text-white/90 disabled:hidden"
          >
            <ChevronIcon dir="right" />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Cột ảnh thu nhỏ bên trái + slide lớn bên phải (như Google Slides,
          PowerPoint). Trên điện thoại: dải ảnh thu nhỏ cuộn ngang dưới slide. */}
      <div className={total > 1 ? "flex flex-col-reverse lg:flex-row gap-3" : ""}>
        {total > 1 && (
          <div className="lg:w-40 xl:w-44 shrink-0 lg:relative">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto lg:absolute lg:inset-0 pb-1 lg:pb-0 lg:pr-1.5">
              {pages.map((p, i) => (
                <Thumb
                  key={i}
                  number={i + 1}
                  ratio={p.width && p.height ? p.width / p.height : 16 / 9}
                  path={`${pagePath(i + 1)}?thumb=1`}
                  active={i === index}
                  onClick={() => go(i)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div
            ref={stageRef}
            className={
              presenting
                ? "fixed inset-0 z-[100] bg-black flex items-center justify-center " + (idle ? "cursor-none" : "cursor-pointer")
                : "relative bg-gray-900 overflow-hidden rounded-xl"
            }
            onMouseMove={wake}
            onClick={onStageClick}
            onTouchStart={(e) => {
              wake();
              onTouchStart(e);
            }}
            onTouchEnd={onTouchEnd}
            style={{ WebkitTouchCallout: "none" }}
          >
            {slide}

            {presenting && (
              <>
                {/* Thanh tiến độ mảnh ở mép dưới — luôn hiện, không che slide. */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 pointer-events-none">
                  <div className="h-full bg-primary transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
                </div>
                <div
                  className={
                    "absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/70 text-white text-sm rounded-full px-2 py-1.5 transition-opacity " +
                    (idle ? "opacity-0 pointer-events-none" : "opacity-100")
                  }
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton label="Trang trước" onClick={() => go(index - 1)} disabled={index === 0}>
                    ‹
                  </IconButton>
                  <span className="tabular-nums px-2">
                    {index + 1} / {total}
                  </span>
                  <IconButton label="Trang sau" onClick={() => go(index + 1)} disabled={index === total - 1}>
                    ›
                  </IconButton>
                  <button type="button" onClick={exitPresenting} className="ml-1 pl-3 pr-2 border-l border-white/30 text-xs hover:text-primary">
                    Thoát (Esc)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Thanh điều khiển ở chế độ xem */}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              ‹ Trước
            </button>
            <span className="flex-1 text-center text-sm text-gray-600 tabular-nums">
              <span className="hidden sm:inline">Trang </span>
              <b className="text-gray-900">{index + 1}</b> / {total}
            </span>
            <button
              type="button"
              onClick={startPresenting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
              title="Xem toàn màn hình (phím ← → để chuyển trang, Esc để thoát)"
            >
              <FullscreenIcon /> Toàn màn hình
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === total - 1}
              className="px-4 py-2 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900 text-sm disabled:opacity-40"
            >
              Sau ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Một ảnh thu nhỏ trong cột xem trước. CHỈ TẢI KHI CUỘN TỚI (IntersectionObserver):
 * bộ 50 trang không phải kéo 50 ảnh ngay lúc mở.
 */
function Thumb({ number, ratio, path, active, onClick }) {
  const ref = useRef(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let cancelled = false;
    let objectUrl = "";
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        api
          .blob(path)
          .then((blob) => {
            if (cancelled) return;
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          })
          .catch(() => {});
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => {
      cancelled = true;
      obs.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  // Trang đang xem luôn nằm trong tầm nhìn của cột (lật bằng phím, bằng nút...).
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={`Trang ${number}`}
      aria-current={active ? "true" : undefined}
      className="group flex items-start gap-1.5 shrink-0 w-28 lg:w-full text-left"
    >
      <span className={"w-5 pt-0.5 text-right text-[11px] tabular-nums shrink-0 " + (active ? "text-gray-900 font-semibold" : "text-gray-400")}>
        {number}
      </span>
      <span
        className={
          "relative flex-1 rounded-md overflow-hidden bg-gray-100 border-2 transition " +
          (active ? "border-primary-dark shadow-sm" : "border-transparent group-hover:border-gray-300")
        }
        style={{ aspectRatio: ratio }}
      >
        {url && (
          <img src={url} alt="" draggable={false} className="absolute inset-0 w-full h-full object-contain bg-white pointer-events-none" />
        )}
      </span>
    </button>
  );
}

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-full text-lg leading-none hover:bg-white/15 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Lặp chữ chéo mờ khắp slide. Đủ mờ để không cản đọc, đủ dày để không cắt bỏ được. */
function Watermark({ text }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute -inset-1/2 flex flex-wrap content-start gap-x-16 gap-y-12 -rotate-[24deg]">
        {/* Đủ nhiều để phủ kín cả khi trình chiếu trên màn hình lớn. */}
        {Array.from({ length: 480 }, (_, i) => (
          <span
            key={i}
            className="text-[13px] font-semibold whitespace-nowrap text-gray-900/[0.09]"
            style={{ textShadow: "0 0 1px rgba(255,255,255,0.35)" }}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChevronIcon({ dir }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="drop-shadow">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}
