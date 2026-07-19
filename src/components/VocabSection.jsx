export default function VocabSection({ vocabulary, onComplete }) {
  return (
    <div>
      <div className="space-y-3 mb-4">
        {vocabulary.map((item, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-lg font-medium">{item.hanzi}</span>
              <span className="text-sm text-gray-500">{item.pinyin}</span>
              <span className="text-xs text-primary-dark bg-primary/20 px-2 py-0.5 rounded ml-auto">
                {item.pos}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-1">{item.meaning}</p>
            <p className="text-xs text-gray-500">
              {item.example.hanzi} ({item.example.pinyin}) — {item.example.vi}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
      >
        Tiếp tục
      </button>
    </div>
  )
}
