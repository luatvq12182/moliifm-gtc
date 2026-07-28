import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  Link,
} from "react-router-dom";
import { slugify } from "../../lib/slugify.js";
import {
  useLessonQuery,
  useCreateLesson,
  useUpdateLesson,
} from "../../hooks/useLessons.js";
import VideosEditor from "../../components/admin/lesson-editor/VideosEditor.jsx";
import VocabularyEditor from "../../components/admin/lesson-editor/VocabularyEditor.jsx";
import ExercisesEditor from "../../components/admin/lesson-editor/ExercisesEditor.jsx";

const EMPTY_LESSON = {
  title: "",
  slug: "",
  description: "",
  order: 0,
  status: "draft",
  videos: [],
  vocabulary: [],
  exercises: {
    multipleChoice: [],
    trueFalse: [],
    sentenceOrder: [],
    shortAnswer: [],
  },
};

export default function AdminLessonEditPage() {
  const { id } = useParams(); // có id -> đang sửa; không có -> đang tạo mới
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId") || "";
  const navigate = useNavigate();

  const isEdit = Boolean(id);
  const { data: existingLesson, isLoading: loadingLesson } = useLessonQuery(id);
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();

  const [lesson, setLesson] = useState(EMPTY_LESSON);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && existingLesson) {
      setLesson({
        title: existingLesson.title || "",
        slug: existingLesson.slug || "",
        description: existingLesson.description || "",
        order: existingLesson.order ?? 0,
        status: existingLesson.status || "draft",
        videos: existingLesson.videos || [],
        vocabulary: existingLesson.vocabulary || [],
        exercises: {
          multipleChoice: existingLesson.exercises?.multipleChoice || [],
          trueFalse: existingLesson.exercises?.trueFalse || [],
          sentenceOrder: existingLesson.exercises?.sentenceOrder || [],
          shortAnswer: existingLesson.exercises?.shortAnswer || [],
        },
      });
    }
  }, [isEdit, existingLesson]);

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setLesson((l) => ({
      ...l,
      title,
      slug: slugTouched ? l.slug : slugify(title),
    }));
  };

  const handleSlugChange = (e) => {
    setSlugTouched(true);
    setLesson((l) => ({ ...l, slug: e.target.value }));
  };

  const handleField = (field) => (e) => {
    setLesson((l) => ({ ...l, [field]: e.target.value }));
  };

  const handleSave = () => {
    setError("");

    if (!lesson.title.trim() || !lesson.slug.trim()) {
      setError("Vui lòng nhập đầy đủ tiêu đề và slug bài học.");
      return;
    }

    const payload = { ...lesson, order: Number(lesson.order) || 0 };

    if (isEdit) {
      updateLesson.mutate(
        { id, payload },
        {
          onSuccess: () =>
            navigate(`/admin/gtc/lessons?courseId=${existingLesson.courseId}`),
          onError: (err) => setError(err.message),
        },
      );
    } else {
      createLesson.mutate(
        { ...payload, courseId },
        {
          onSuccess: () => navigate(`/admin/gtc/lessons?courseId=${courseId}`),
          onError: (err) => setError(err.message),
        },
      );
    }
  };

  if (isEdit && loadingLesson) {
    return (
      <p className="text-sm text-gray-400">Đang tải nội dung bài học...</p>
    );
  }

  if (!isEdit && !courseId) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        Thiếu thông tin khóa học — quay lại{" "}
        <Link to="/admin/gtc/lessons" className="text-primary-dark underline">
          trang Bài học
        </Link>{" "}
        để chọn khóa học trước khi tạo bài mới.
      </div>
    );
  }

  const submitting = isEdit ? updateLesson.isPending : createLesson.isPending;

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <Link
          to={`/admin/gtc/lessons?courseId=${isEdit ? existingLesson?.courseId : courseId}`}
          className="text-xs text-gray-500 hover:underline"
        >
          ← Danh sách bài học
        </Link>
        <h1 className="text-xl font-heading font-semibold mt-1">
          {isEdit ? "Sửa nội dung bài học" : "Thêm bài học mới"}
        </h1>
      </div>

      <Section title="Thông tin cơ bản" subtitle="Bắt buộc">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Tiêu đề *
              </label>
              <input
                type="text"
                value={lesson.title}
                onChange={handleTitleChange}
                placeholder="Bài 1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Slug *</label>
              <input
                type="text"
                value={lesson.slug}
                onChange={handleSlugChange}
                placeholder="bai-1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Mô tả</label>
            <input
              type="text"
              value={lesson.description}
              onChange={handleField("description")}
              placeholder="Làm quen - giới thiệu bản thân"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Thứ tự hiển thị
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={lesson.order}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^\d*$/.test(raw))
                    setLesson((l) => ({ ...l, order: raw }));
                }}
                onBlur={(e) => {
                  const num = Number(e.target.value);
                  setLesson((l) => ({
                    ...l,
                    order: Number.isFinite(num) ? num : 0,
                  }));
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Trạng thái
              </label>
              <select
                value={lesson.status}
                onChange={handleField("status")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Đã xuất bản</option>
              </select>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Video & hội thoại"
        subtitle={`${lesson.videos.length} video`}
        defaultOpen={false}
      >
        <VideosEditor
          videos={lesson.videos}
          onChange={(videos) => setLesson((l) => ({ ...l, videos }))}
        />
      </Section>

      <Section
        title="Từ vựng & ngữ pháp mở rộng"
        subtitle={`${lesson.vocabulary.length} mục`}
        defaultOpen={false}
      >
        <VocabularyEditor
          vocabulary={lesson.vocabulary}
          onChange={(vocabulary) => setLesson((l) => ({ ...l, vocabulary }))}
        />
      </Section>

      <Section
        title="Bài tập luyện tập"
        subtitle="4 dạng bài"
        defaultOpen={false}
      >
        <ExercisesEditor
          exercises={lesson.exercises}
          onChange={(exercises) => setLesson((l) => ({ ...l, exercises }))}
        />
      </Section>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white disabled:opacity-60"
        >
          {submitting ? "Đang lưu..." : "Lưu bài học"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, subtitle, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left"
      >
        <span className="text-sm font-bold">{title}</span>
        <span className="text-xs text-gray-400">{subtitle}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
