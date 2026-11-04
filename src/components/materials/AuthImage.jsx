import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/apiClient.js";

/**
 * Ảnh phải tải qua API có đăng nhập (ảnh bìa video, …) — thẻ <img src> thường
 * không gửi kèm token. Chỉ tải khi ảnh sắp lọt vào màn hình.
 *
 * @param path      đường dẫn API, vd. /materials/videos/<id>/thumb
 * @param fallback  hiện khi chưa có ảnh / lỗi
 */
export default function AuthImage({ path, alt = "", className = "", fallback = null }) {
  const ref = useRef(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el || !path) return undefined;
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

  return (
    <span ref={ref} className={"block overflow-hidden " + className}>
      {url ? (
        <img
          src={url}
          alt={alt}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full object-cover select-none"
        />
      ) : (
        fallback
      )}
    </span>
  );
}
