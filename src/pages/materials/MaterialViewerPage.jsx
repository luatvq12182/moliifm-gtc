import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader.jsx";
import SlideViewer from "../../components/materials/SlideViewer.jsx";
import { myDeckPagePath, useMyDeck } from "../../hooks/useMaterials.js";

/** Học liệu khoá học — xem một bộ slide. */
export default function MaterialViewerPage() {
  const { courseSlug, deckId } = useParams();
  const { data: deck, isLoading, isError, error } = useMyDeck(deckId);
  const pagePath = useCallback((n) => myDeckPagePath(deckId, n), [deckId]);

  // Watermark: ai chụp màn hình phát tán thì vẫn biết là tài khoản nào.
  // Tên + số điện thoại do máy chủ trả kèm bộ slide.
  const watermark = [deck?.viewer?.name, deck?.viewer?.phone].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen">
      <SiteHeader
        backTo={`/hoc-lieu/${courseSlug}`}
        backLabel="Danh sách bài giảng"
        title={deck ? deck.title : "Bài giảng"}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
        {isError && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-700">{error.message}</p>
            <Link to={`/hoc-lieu/${courseSlug}`} className="inline-block mt-3 text-sm text-primary-dark underline">
              Quay lại danh sách bài giảng
            </Link>
          </div>
        )}

        {deck && (
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4">
            {/* key theo version: giảng viên thay file thì dựng lại, không giữ ảnh cũ. */}
            <SlideViewer key={`${deck._id}-${deck.version}`} pages={deck.pages} pagePath={pagePath} watermark={watermark} />
          </div>
        )}
      </main>
    </div>
  );
}
