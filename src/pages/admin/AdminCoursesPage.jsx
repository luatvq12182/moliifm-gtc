import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCurriculaQuery } from "../../hooks/useCurricula.js";
import {
  useCoursesQuery,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
} from "../../hooks/useCourses.js";
import CourseFormModal from "../../components/admin/CourseFormModal.jsx";

export default function AdminCoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const curriculumId = searchParams.get("curriculumId") || "";

  const { data: curricula = [] } = useCurriculaQuery();
  const {
    data: courses = [],
    isLoading,
    isError,
    error,
  } = useCoursesQuery(curriculumId);

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingCourse, setEditingCourse] = useState(null);

  const handleCurriculumChange = (e) => {
    const id = e.target.value;
    setSearchParams(id ? { curriculumId: id } : {});
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingCourse(null);
    setModalOpen(true);
  };

  const openEditModal = (course) => {
    setModalMode("edit");
    setEditingCourse(course);
    setModalOpen(true);
  };

  const handleModalSubmit = (formData) => {
    if (modalMode === "edit") {
      updateCourse.mutate(
        { id: editingCourse._id, payload: formData },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      createCourse.mutate(
        { ...formData, curriculumId },
        { onSuccess: () => setModalOpen(false) },
      );
    }
  };

  const handleToggleStatus = (course) => {
    updateCourse.mutate({
      id: course._id,
      payload: {
        status: course.status === "published" ? "draft" : "published",
      },
    });
  };

  const handleDelete = (course) => {
    const ok = confirm(
      `Xóa khóa học "${course.name}"? Các bài học bên trong (nếu có) sẽ không còn hiển thị được cho học viên.`,
    );
    if (!ok) return;
    deleteCourse.mutate(course._id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-heading font-semibold">Khóa học</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quản lý các khóa (HSK1, HSK2...) trong từng giáo trình
          </p>
        </div>
        {curriculumId && (
          <button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg shrink-0"
          >
            + Thêm khóa học
          </button>
        )}
      </div>

      {/* Bộ chọn giáo trình */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm text-gray-500 shrink-0">Giáo trình:</label>
        <select
          value={curriculumId}
          onChange={handleCurriculumChange}
          className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">-- Chọn giáo trình --</option>
          {curricula.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
              {c.status === "draft" ? " (bản nháp)" : ""}
            </option>
          ))}
        </select>
        {curricula.length === 0 && (
          <p className="text-xs text-gray-400">
            Chưa có giáo trình nào —{" "}
            <Link
              to="/admin/gtc/curricula"
              className="text-primary-dark underline"
            >
              tạo giáo trình trước
            </Link>
            .
          </p>
        )}
      </div>

      {!curriculumId && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          Chọn 1 giáo trình ở trên để xem/quản lý danh sách khóa học.
        </div>
      )}

      {curriculumId && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {isLoading && (
            <p className="p-4 text-sm text-gray-400">
              Đang tải danh sách khóa học...
            </p>
          )}
          {isError && (
            <p className="p-4 text-sm text-red-600">{error.message}</p>
          )}

          {!isLoading && (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                      <th className="px-4 py-3 font-medium">Khóa học</th>
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">Cấp độ</th>
                      <th className="px-4 py-3 font-medium">Thứ tự</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c) => (
                      <tr
                        key={c._id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{c.name}</p>
                          {c.description && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {c.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                          {c.slug}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {c.level || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.order}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "text-xs font-medium px-2.5 py-1 rounded-full " +
                              (c.status === "published"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700")
                            }
                          >
                            {c.status === "published"
                              ? "Đã xuất bản"
                              : "Bản nháp"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(c)}
                            className="text-xs text-primary-dark hover:underline"
                          >
                            Sửa
                          </button>
                          <span className="text-gray-300">·</span>
                          <button
                            onClick={() => handleToggleStatus(c)}
                            className="text-xs text-gray-600 hover:underline"
                          >
                            {c.status === "published" ? "Ẩn" : "Xuất bản"}
                          </button>
                          <span className="text-gray-300">·</span>
                          <button
                            onClick={() => handleDelete(c)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}

                    {courses.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-gray-400 text-sm"
                        >
                          Chưa có khóa học nào trong giáo trình này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-50">
                {courses.map((c) => (
                  <div key={c._id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {c.slug}
                        </p>
                      </div>
                      <span
                        className={
                          "shrink-0 text-[11px] font-medium px-2 py-1 rounded-full " +
                          (c.status === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700")
                        }
                      >
                        {c.status === "published" ? "Xuất bản" : "Nháp"}
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-xs text-gray-500 mb-3">
                        {c.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs pt-3 border-t border-gray-50">
                      <button
                        onClick={() => openEditModal(c)}
                        className="text-primary-dark font-medium"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className="text-gray-600 font-medium"
                      >
                        {c.status === "published" ? "Ẩn" : "Xuất bản"}
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-red-500 font-medium"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}

                {courses.length === 0 && (
                  <p className="px-4 py-8 text-center text-gray-400 text-sm">
                    Chưa có khóa học nào.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <CourseFormModal
        open={modalOpen}
        mode={modalMode}
        course={editingCourse}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        submitting={
          modalMode === "edit" ? updateCourse.isPending : createCourse.isPending
        }
        apiError={
          (modalMode === "edit"
            ? updateCourse.error?.message
            : createCourse.error?.message) || ""
        }
      />
    </div>
  );
}
