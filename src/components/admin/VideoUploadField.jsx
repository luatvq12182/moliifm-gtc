import { useRef, useState } from "react";
import { useUploadVideo } from "../../hooks/useVideoUpload.js";
import { resolveUploadUrl } from "../../lib/mediaUrl.js";

export default function VideoUploadField({ value, onChange }) {
  const inputRef = useRef(null);
  const uploadVideo = useUploadVideo();
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    uploadVideo.mutate(file, {
      onSuccess: (data) => onChange(data.url),
      onError: (err) => setError(err.message),
    });

    e.target.value = "";
  };

  return (
    <div>
      {value && (
        <video
          src={resolveUploadUrl(value)}
          controls
          className="w-full rounded-lg bg-black mb-2 max-h-48"
        />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadVideo.isPending}
          className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
        >
          {uploadVideo.isPending
            ? "Đang tải lên... (video lớn có thể mất vài phút)"
            : value
              ? "Đổi video khác"
              : "Chọn video từ máy"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-red-500 hover:underline"
          >
            Xóa
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
