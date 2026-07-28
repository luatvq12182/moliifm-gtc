import { useState } from "react";
import { resolveUploadUrl } from "../lib/mediaUrl.js";

export default function ThumbnailImage({ src, alt, className }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={className + " bg-gray-100 flex items-center justify-center"}
      >
        <span className="text-[11px] text-gray-400 text-center px-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolveUploadUrl(src)}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
