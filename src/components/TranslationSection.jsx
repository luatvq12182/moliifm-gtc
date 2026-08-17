export default function TranslationSection({ videos, onComplete }) {
  return (
    <div>
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
