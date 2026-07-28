import { useRef, useState } from "react";
import { useUploadImage } from "../../hooks/useImageUpload.js";
import { resolveUploadUrl } from "../../lib/mediaUrl.js";

// Dùng chung cho mọi ô "ảnh thumbnail" trong form admin — thay cho ô nhập
// text đường dẫn thủ công trước đây. value/onChange nhận & trả về đúng
// chuỗi đường dẫn (vd. "/uploads/images/xxx.png") để lưu thẳng vào DB,
// component tự lo phần preview + gọi API upload.
export default function ImageUploadField({ label, value, onChange }) {
  const inputRef = useRef(null);
  const uploadImage = useUploadImage();
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    uploadImage.mutate(file, {
      onSuccess: (data) => onChange(data.url),
      onError: (err) => setError(err.message),
    });

    e.target.value = ""; // cho phép chọn lại đúng file cũ nếu cần
  };

  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>

      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center">
          {value ? (
            <img
              src={resolveUploadUrl(value)}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[10px] text-gray-300 text-center px-1">
              Chưa có ảnh
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploadImage.isPending}
            className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
          >
            {uploadImage.isPending
              ? "Đang tải lên..."
              : value
                ? "Đổi ảnh khác"
                : "Chọn ảnh"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-red-500 hover:underline ml-2"
            >
              Xóa
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
          {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
