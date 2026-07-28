// Dùng chung cho các danh sách có thể thêm/xóa dòng (hội thoại, từ vựng,
// từng dạng bài tập...). Nơi gọi tự quyết định render nội dung mỗi dòng ra
// sao qua renderItem, còn việc thêm/xóa/cập nhật mảng được xử lý chung ở đây.
export default function ListEditor({
  items,
  onChange,
  renderItem,
  newItem,
  addLabel,
}) {
  const updateItem = (index, patch) => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, newItem()]);
  };

  return (
    <div>
      <div className="space-y-3 mb-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-3 relative"
          >
            <span className="absolute top-2 left-2 text-[10px] text-gray-300 font-mono">
              #{index + 1}
            </span>
            <div className="pt-4">
              {renderItem(item, index, (patch) => updateItem(index, patch))}
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="absolute top-2 right-2 text-xs text-red-500 hover:underline"
            >
              Xóa
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-gray-400">Chưa có mục nào.</p>
        )}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="text-xs text-primary-dark border border-primary-dark/40 rounded-lg px-3 py-1.5 hover:bg-primary/10"
      >
        {addLabel}
      </button>
    </div>
  );
}
