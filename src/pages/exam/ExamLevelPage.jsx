import { Link, useParams, useSearchParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader.jsx";
import AuthImage from "../../components/materials/AuthImage.jsx";
import { formatTime } from "../../components/materials/VideoPlayer.jsx";
import { myExamVideoThumbPath, useMyExamLevel } from "../../hooks/useExam.js";

/**
 * Luyện thi HSK 3.0 — một cấp thi, hai mục (chọn bằng hai thẻ ở đầu, ghi trên
 * đường dẫn ?muc=… để xem video xong bấm quay lại vẫn đúng mục):
 *  - "Hướng dẫn kỹ năng thi": video YouTube
 *  - "Luyện đề AI chấm chữa": đề thi thử bấm giờ
 */
const SECTIONS = [
  { id: "ky-nang", label: "Hướng dẫn kỹ năng thi" },
  { id: "luyen-de", label: "Luyện đề AI chấm chữa" },
];

export default function ExamLevelPage() {
  const { levelSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, isError, error } = useMyExamLevel(levelSlug);
  const level = data?.level;
  const videos = data?.videos || [];
  const tests = data?.tests || [];
  const section = SECTIONS.find((s) => s.id === params.get("muc"))?.id || "ky-nang";

  return (
    <div className="min-h-screen">
      <SiteHeader backTo="/luyen-thi" backLabel="Chọn cấp khác" title={level ? level.name : "Luyện thi HSK 3.0"} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
        {isError && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-700">{error.message}</p>
            <Link to="/luyen-thi" className="inline-block mt-3 text-sm text-primary-dark underline">
              Quay lại danh sách cấp thi
            </Link>
          </div>
        )}

        {level && (
          <>
            <h2 className="text-xl font-bold">{level.name}</h2>
            {level.description && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{level.description}</p>}

            <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4 mb-4" role="tablist">
              {SECTIONS.map((s) => {
                const active = s.id === section;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setParams({ muc: s.id }, { replace: true })}
                    className={
                      "text-left rounded-2xl border-2 px-3 py-2.5 sm:px-4 sm:py-3 transition " +
                      (active ? "border-primary bg-primary/15 shadow-sm" : "border-gray-200 bg-white hover:border-primary/60")
                    }
                  >
                    <span className={"block text-sm sm:text-base font-heading font-semibold " + (active ? "text-gray-900" : "text-gray-700")}>
                      {s.label}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {s.id === "ky-nang" ? `${videos.length} video` : tests.length ? `${tests.length} đề` : "Sắp ra mắt"}
                    </span>
                  </button>
                );
              })}
            </div>

            {section === "ky-nang" &&
              (videos.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-500">
                  Chưa có video hướng dẫn nào. Trung tâm sẽ cập nhật sớm.
                </div>
              ) : (
                <VideoGrid videos={videos} levelSlug={levelSlug} />
              ))}

            {section === "luyen-de" &&
              (tests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-orange-200 p-8 text-center">
                  <p className="text-gray-800 font-medium">📝 Đề thi thử đang được chuẩn bị</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Làm đề bấm giờ như thi thật (nghe – đọc – viết), máy chấm phần trắc nghiệm, AI chấm chữa phần viết.
                  </p>
                </div>
              ) : (
                <TestList tests={tests} levelSlug={levelSlug} />
              ))}
          </>
        )}
      </main>
    </div>
  );
}

function VideoGrid({ videos, levelSlug }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {videos.map((v) => {
        const p = v.progress;
        return (
          <Link
            key={v._id}
            to={`/luyen-thi/${levelSlug}/video/${v._id}`}
            className="group bg-white rounded-2xl border border-orange-200 overflow-hidden hover:border-primary transition shadow-[0_6px_20px_-8px_rgba(230,168,0,0.25)]"
          >
            <div className="relative aspect-video bg-gradient-to-br from-amber-300 to-orange-400">
              {v.hasThumb && <AuthImage path={myExamVideoThumbPath(v._id)} alt={v.title} className="absolute inset-0 w-full h-full" />}
              <span className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100">
                <span className="w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
              {v.durationSec > 0 && (
                <span className="absolute bottom-1 right-1 text-[11px] font-medium bg-black/75 text-white px-1.5 py-0.5 rounded">{formatTime(v.durationSec)}</span>
              )}
              {p && p.percent > 0 && <span className="absolute bottom-0 left-0 h-1 bg-red-500" style={{ width: `${p.percent}%` }} />}
            </div>
            <div className="p-2.5 sm:p-3">
              <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{v.title}</p>
              <p className={"text-[11px] mt-1 " + (p?.completed ? "text-green-700 font-medium" : p ? "text-primary-dark font-medium" : "text-gray-400")}>
                {p?.completed ? "✓ Đã xem" : p ? `Đang xem · ${p.percent}%` : "Chưa xem"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function TestList({ tests, levelSlug }) {
  return (
    <div className="space-y-3">
      {tests.map((t, i) => {
        const open = Boolean(t.inProgressId);
        return (
          <Link
            key={t._id}
            to={open ? `/luyen-thi/${levelSlug}/lam-bai/${t.inProgressId}` : `/luyen-thi/${levelSlug}/de/${t._id}`}
            className="flex items-center gap-4 bg-white rounded-2xl border border-orange-200 p-4 hover:border-primary transition shadow-[0_6px_20px_-6px_rgba(230,168,0,0.25)]"
          >
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-heading font-semibold text-lg shrink-0">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-gray-900">{t.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t.questionCount} câu · khoảng {Math.round(t.durationSec / 60)} phút
              </p>
              <p className={"text-xs mt-0.5 " + (open ? "text-amber-700 font-medium" : t.submittedCount ? "text-green-700" : "text-gray-400")}>
                {open
                  ? "Đang làm dở — giờ vẫn đang chạy"
                  : t.submittedCount
                    ? `✓ Đã làm ${t.submittedCount} lần` + (t.last?.total != null ? ` · lần gần nhất ${t.last.total}/${t.last.max} điểm${t.last.passed ? " — Đạt" : ""}` : "")
                    : "Chưa làm"}
              </p>
            </div>
            <span className="shrink-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-medium px-4 py-2 rounded-full">
              {open ? "Làm tiếp" : t.submittedCount ? "Làm lại" : "Làm đề"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
