import { useEffect, useRef, useState } from "react";
import { useUploadVideo } from "../../hooks/useVideoUpload.js";
import { api } from "../../lib/apiClient.js";
import { resolveUploadUrl } from "../../lib/mediaUrl.js";

export default function VideoUploadField({ value, onChange }) {
  const inputRef = useRef(null);
  const uploadVideo = useUploadVideo();
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [processing, setProcessing] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (jobId) => {
    setProcessing(true);
    pollRef.current = setInterval(async () => {
      try {
        const job = await api.get(`/admin/uploads/video/status/${jobId}`);
        if (job.status === "done") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setProcessing(false);
          if (job.error) setWarning(job.error);
          onChange(job.url);
        }
      } catch (e) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setProcessing(false);
        setError(
          "Mất kết nối khi theo dõi tiến trình nén — tải lại trang và thử lại.",
        );
      }
    }, 3000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setWarning("");

    uploadVideo.mutate(file, {
      onSuccess: (data) => {
        if (data.jobId) startPolling(data.jobId);
        else onChange(data.url);
      },
      onError: (err) => setError(err.message),
    });

    e.target.value = "";
  };

  const busy = uploadVideo.isPending || processing;

  return (
    <div>
      {value && !processing && (
        <video
          src={resolveUploadUrl(value)}
          controls
          className="w-full rounded-lg bg-black mb-2 max-h-48"
        />
      )}

      {processing && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-2">
          <Spinner />
          <p className="text-xs text-amber-800">
            Đang nén video trên server để tối ưu tốc độ phát... Quá trình này
            mất vài phút tùy độ dài video — bạn có thể tiếp tục nhập các phần
            khác trong lúc chờ, đừng đóng trang.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
        >
          {uploadVideo.isPending
            ? "Đang tải lên..."
            : processing
              ? "Đang nén video..."
              : value
                ? "Đổi video khác"
                : "Chọn video từ máy"}
        </button>
        {value && !busy && (
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
      {warning && <p className="text-[11px] text-amber-600 mt-1">{warning}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin shrink-0 text-amber-600"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 00-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
