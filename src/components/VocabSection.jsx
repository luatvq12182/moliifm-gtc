export default function VocabSection({
  vocabulary,
  videos = [],
  onRequestPlaySegment,
  onComplete,
}) {
  const findMatch = (hanzi) => {
    for (let videoIndex = 0; videoIndex < videos.length; videoIndex++) {
      const line = (videos[videoIndex].dialogue || []).find((l) =>
        l.hanzi.includes(hanzi),
      );
      if (line) return { videoIndex, line };
    }
    return null;
  };

  return (
    <div>
      <div className="space-y-3 mb-4">
        {vocabulary.map((item, i) => {
          const isGrammar = item.pos === "Cấu trúc ngữ pháp";
          const match = !isGrammar ? findMatch(item.hanzi) : null;

          return (
            <div key={i} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-lg font-medium">{item.hanzi}</span>
                <span className="text-sm text-gray-500">{item.pinyin}</span>

                {match && (
                  <button
                    onClick={() =>
                      onRequestPlaySegment?.(
                        match.videoIndex,
                        match.line.startTime,
                        match.line.endTime,
                      )
                    }
                    title="Nghe cách đọc trong hội thoại"
                    className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 shrink-0 text-gray-600"
                  >
                    <SpeakerIcon />
                  </button>
                )}

                <span className="text-xs text-primary-dark bg-primary/20 px-2 py-0.5 rounded ml-auto">
                  {item.pos}
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-2">{item.meaning}</p>

              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-500 mb-1">Ví dụ:</p>
                <p className="text-sm">{item.example.hanzi}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.example.pinyin}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.example.vi}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onComplete}
        className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
      >
        Tiếp tục
      </button>
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="3 9 3 15 8 15 13 20 13 4 8 9 3 9" />
      <path d="M16 8a5 5 0 010 8" strokeLinecap="round" />
    </svg>
  );
}
