export default function TranslationSection({ videos, onComplete }) {
  return (
    <div>
      {/* Lời nhắc chép bài — yêu cầu của khách hàng: học viên đọc xong bản dịch
          thì chép lại bài khóa vào vở để nhớ mặt chữ. Đặt NGOÀI khung cuộn để
          nó luôn nhìn thấy, không bị trôi mất khi kéo danh sách câu. */}
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mb-3">
        <span className="text-amber-600 shrink-0 mt-0.5">
          <PencilIcon />
        </span>
        <p className="text-sm text-amber-800 leading-snug">
          Hãy chép lại bài khóa vào vở nhé!
        </p>
      </div>

      <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1 mb-4">
        {videos.map((video, vIndex) => (
          <div key={vIndex}>
            {videos.length > 1 && (
              <p className="text-xs font-medium text-gray-500 mb-2">
                {video.title || `Video ${vIndex + 1}`}
              </p>
            )}
            <div className="space-y-2">
              {video.dialogue.map((line, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  <p className="text-sm font-medium">
                    {line.speaker && (
                      <span className="text-gray-400 font-normal mr-1.5">
                        {line.speaker}:
                      </span>
                    )}
                    {line.hanzi}
                  </p>
                  {line.pinyin && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {line.pinyin}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">{line.vi}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
      >
        Hoàn thành bài học
      </button>
    </div>
  );
}

function PencilIcon() {
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
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
