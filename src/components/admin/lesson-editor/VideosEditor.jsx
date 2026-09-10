import { useState } from "react";
import ListEditor from "./ListEditor.jsx";
import DialogueEditor from "./DialogueEditor.jsx";
import VocabularyEditor from "./VocabularyEditor.jsx";
import ExercisesEditor from "./ExercisesEditor.jsx";
import VideoUploadField from "../VideoUploadField.jsx";
import { extractYoutubeId } from "../../../lib/youtube.js";
import { countExercises } from "../../../lib/lessonVideos.js";

const EMPTY_EXERCISES = () => ({
  multipleChoice: [],
  trueFalse: [],
  sentenceOrder: [],
  shortAnswer: [],
});

// Mỗi video là một khối nội dung khép kín, khớp một-một với một file docx mà
// giảng viên soạn: lời thoại, từ vựng, bài tập của đúng video đó. Học viên xem
// video nào thì chỉ thấy nội dung của video ấy.
const NEW_VIDEO = () => ({
  title: "",
  description: "",
  type: "upload",
  videoUrl: "",
  youtubeId: "",
  dialogue: [],
  vocabulary: [],
  exercises: EMPTY_EXERCISES(),
});

export default function VideosEditor({ videos, onChange }) {
  return (
    <ListEditor
      items={videos}
      onChange={onChange}
      newItem={NEW_VIDEO}
      addLabel="+ Thêm video"
      renderItem={(video, index, update) => (
        <div className="space-y-3">
          <input
            type="text"
            value={video.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Tiêu đề video (vd. Cảnh 1: Trong nhà ăn)"
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
          />
          <input
            type="text"
            value={video.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Mô tả ngắn (không bắt buộc)"
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
          />

          <div>
            <p className="text-[12px] font-semibold text-gray-700 mb-1.5">Nguồn video:</p>
            <div className="inline-flex p-0.5 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => update({ type: "upload" })}
                className={
                  "px-4 py-1.5 text-xs rounded-md transition " +
                  (video.type === "upload"
                    ? "bg-white shadow-sm font-medium text-gray-900"
                    : "text-gray-500 hover:text-gray-700")
                }
              >
                Tải video lên từ máy
              </button>
              <button
                type="button"
                onClick={() => update({ type: "youtube" })}
                className={
                  "px-4 py-1.5 text-xs rounded-md transition " +
                  (video.type === "youtube"
                    ? "bg-white shadow-sm font-medium text-gray-900"
                    : "text-gray-500 hover:text-gray-700")
                }
              >
                Link YouTube
              </button>
            </div>
          </div>

          {video.type === "youtube" ? (
            <div>
              <input
                type="text"
                value={video.youtubeId}
                onChange={(e) =>
                  update({ youtubeId: extractYoutubeId(e.target.value) })
                }
                placeholder="Dán link YouTube hoặc ID video"
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm font-mono"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Đặt chế độ hiển thị video là "Không công khai" (Unlisted) trên
                YouTube — video vẫn xem được qua link nhưng không hiện trong tìm
                kiếm/kênh công khai.
              </p>
            </div>
          ) : (
            <VideoUploadField
              value={video.videoUrl}
              onChange={(url) => update({ videoUrl: url })}
            />
          )}

          {/* Ba khối nội dung của riêng video này. Gấp lại mặc định để danh
              sách video còn nhìn được — mở một video ra soạn thì bung khối cần
              soạn, không phải cuộn qua 300 dòng bài tập của video khác. */}
          <SubBlock
            label="Hội thoại"
            count={`${(video.dialogue || []).length} câu`}
          >
            <DialogueEditor
              dialogue={video.dialogue || []}
              onChange={(dialogue) => update({ dialogue })}
            />
          </SubBlock>

          <SubBlock
            label="Từ vựng & ngữ pháp mở rộng"
            count={`${(video.vocabulary || []).length} mục`}
          >
            <VocabularyEditor
              vocabulary={video.vocabulary || []}
              onChange={(vocabulary) => update({ vocabulary })}
            />
          </SubBlock>

          <SubBlock
            label="Bài tập luyện tập"
            count={`${countExercises(video.exercises)} câu`}
          >
            <ExercisesEditor
              exercises={video.exercises || EMPTY_EXERCISES()}
              onChange={(exercises) => update({ exercises })}
            />
          </SubBlock>
        </div>
      )}
    />
  );
}

// Khối gấp/mở bên trong một video.
function SubBlock({ label, count, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-gray-200 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left mb-2"
      >
        <span className="text-xs font-semibold text-gray-700">
          {open ? "▾" : "▸"} {label}
        </span>
        <span className="text-[11px] text-gray-400">{count}</span>
      </button>
      {open && children}
    </div>
  );
}
