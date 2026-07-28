import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useCurriculaQuery,
  useCreateCurriculum,
  useUpdateCurriculum,
  useDeleteCurriculum,
} from "../../hooks/useCurricula.js";
import CurriculumFormModal from "../../components/admin/CurriculumFormModal.jsx";

export default function AdminCurriculaPage() {
  const {
    data: curricula = [],
    isLoading,
    isError,
    error,
  } = useCurriculaQuery();
  const createCurriculum = useCreateCurriculum();
  const updateCurriculum = useUpdateCurriculum();
  const deleteCurriculum = useDeleteCurriculum();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingCurriculum, setEditingCurriculum] = useState(null);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingCurriculum(null);
    setModalOpen(true);
  };

  const openEditModal = (curriculum) => {
    setModalMode("edit");
    setEditingCurriculum(curriculum);
    setModalOpen(true);
  };

  const handleModalSubmit = (formData) => {
    if (modalMode === "edit") {
      updateCurriculum.mutate(
        { id: editingCurriculum._id, payload: formData },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      createCurriculum.mutate(formData, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const handleToggleStatus = (curriculum) => {
    updateCurriculum.mutate({
      id: curriculum._id,
      payload: {
        status: curriculum.status === "published" ? "draft" : "published",
      },
    });
  };

  const handleDelete = (curriculum) => {
    const ok = confirm(
      `Xóa giáo trình "${curriculum.name}"? Các khóa học/bài học bên trong (nếu có) sẽ không còn hiển thị được cho học viên.`,
    );
    if (!ok) return;
    deleteCurriculum.mutate(curriculum._id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-heading font-semibold">Giáo trình</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quản lý các giáo trình thuộc Luyện nghe nói qua video AI (vd. GTC
            2.0, GTC 3.0...)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg shrink-0"
        >
          + Thêm giáo trình
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading && (
          <p className="p-4 text-sm text-gray-400">
            Đang tải danh sách giáo trình...
          </p>
        )}
        {isError && <p className="p-4 text-sm text-red-600">{error.message}</p>}

        {!isLoading && (
          <>
            {/* Bảng — desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                    <th className="px-4 py-3 font-medium">Giáo trình</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Thứ tự</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {curricula.map((c) => (
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
                        <Link
                          to={`/admin/gtc/courses?curriculumId=${c._id}`}
                          className="text-xs text-gray-600 hover:underline"
                        >
                          Khóa học →
                        </Link>
                        <span className="text-gray-300">·</span>
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

                  {curricula.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-400 text-sm"
                      >
                        Chưa có giáo trình nào — bấm "+ Thêm giáo trình" để tạo
                        mới.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Card — mobile */}
            <div className="md:hidden divide-y divide-gray-50">
              {curricula.map((c) => (
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
                    <Link
                      to={`/admin/gtc/courses?curriculumId=${c._id}`}
                      className="text-gray-600 font-medium"
                    >
                      Khóa học
                    </Link>
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

              {curricula.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">
                  Chưa có giáo trình nào.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <CurriculumFormModal
        open={modalOpen}
        mode={modalMode}
        curriculum={editingCurriculum}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        submitting={
          modalMode === "edit"
            ? updateCurriculum.isPending
            : createCurriculum.isPending
        }
        apiError={
          (modalMode === "edit"
            ? updateCurriculum.error?.message
            : createCurriculum.error?.message) || ""
        }
      />
    </div>
  );
}
