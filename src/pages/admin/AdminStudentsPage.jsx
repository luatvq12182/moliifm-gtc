import { useEffect, useState } from "react";
import {
  useStudentsQuery,
  useToggleStudentStatus,
  useDeleteStudent,
  useCreateStudent,
  useResetStudentPassword,
  useUpdateStudent,
} from "../../hooks/useStudents.js";
import StudentFormModal from "../../components/admin/StudentFormModal.jsx";
import CredentialModal from "../../components/admin/CredentialModal.jsx";

function formatJoinedDate(createdAt) {
  return new Date(createdAt).toLocaleDateString("vi-VN");
}

export default function AdminStudentsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [editingStudent, setEditingStudent] = useState(null);
  const [credential, setCredential] = useState(null); // { name, tempPassword } | null

  const { data, isLoading, isError, error } = useStudentsQuery({
    search: debouncedSearch,
    page,
  });
  const students = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  const toggleStatus = useToggleStudentStatus();
  const deleteStudent = useDeleteStudent();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const resetPassword = useResetStudentPassword();

  // Debounce: chỉ cập nhật debouncedSearch (dùng làm queryKey thật) sau 400ms
  // ngừng gõ, tránh gọi API liên tục mỗi phím bấm.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // gõ tìm kiếm mới thì quay về trang 1
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleStatus = (student) => {
    toggleStatus.mutate(student._id, {
      onError: (err) => alert(err.message),
    });
  };

  const handleDelete = (student) => {
    if (
      !confirm(
        `Xóa học viên "${student.name}"? Hành động này không thể hoàn tác.`,
      )
    )
      return;
    deleteStudent.mutate(student._id, {
      onError: (err) => alert(err.message),
    });
  };

  const handleResetPassword = (student) => {
    if (
      !confirm(
        `Đặt lại mật khẩu cho "${student.name}"? Mật khẩu cũ sẽ không còn dùng được.`,
      )
    )
      return;

    resetPassword.mutate(student._id, {
      onSuccess: ({ tempPassword }) => {
        setCredential({ name: student.name, tempPassword });
      },
      onError: (err) => alert(err.message),
    });
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingStudent(null);
    setModalOpen(true);
  };

  const openEditModal = (student) => {
    setModalMode("edit");
    setEditingStudent(student);
    setModalOpen(true);
  };

  const handleModalSubmit = (formData) => {
    if (modalMode === "edit") {
      updateStudent.mutate(
        { id: editingStudent._id, payload: formData },
        {
          onSuccess: () => setModalOpen(false),
        },
      );
    } else {
      createStudent.mutate(formData, {
        onSuccess: ({ student, tempPassword }) => {
          setModalOpen(false);
          setCredential({ name: student.name, tempPassword });
        },
      });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-heading font-semibold">
            Tài khoản học viên
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {students.length} học viên đã đăng ký
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg shrink-0"
        >
          + Thêm học viên
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full sm:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {isLoading && (
          <p className="p-4 text-sm text-gray-400">
            Đang tải danh sách học viên...
          </p>
        )}
        {isError && <p className="p-4 text-sm text-red-600">{error.message}</p>}

        {/* ---- Dạng bảng, chỉ hiện từ md trở lên ---- */}
        {!isLoading && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Học viên</th>
                  <th className="px-4 py-3 font-medium">Số điện thoại</th>
                  <th className="px-4 py-3 font-medium">Khóa học</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Ngày tham gia</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s._id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-medium shrink-0">
                          {s.name.split(" ").slice(-1)[0][0]}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {s.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.course || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "text-xs font-medium px-2.5 py-1 rounded-full " +
                          (s.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500")
                        }
                      >
                        {s.status === "active" ? "Đang hoạt động" : "Đã khóa"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatJoinedDate(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(s)}
                        className="text-xs text-primary-dark hover:underline"
                      >
                        Sửa
                      </button>
                      <span className="text-gray-300">·</span>
                      <button
                        onClick={() => handleResetPassword(s)}
                        className="text-xs text-gray-600 hover:underline"
                      >
                        Đặt lại MK
                      </button>
                      <span className="text-gray-300">·</span>
                      <button
                        onClick={() => handleToggleStatus(s)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        {s.status === "active" ? "Khóa" : "Mở khóa"}
                      </button>
                    </td>
                  </tr>
                ))}

                {students.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-400 text-sm"
                    >
                      Không tìm thấy học viên phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Dạng card, chỉ hiện dưới md ---- */}
        {!isLoading && (
          <div className="md:hidden divide-y divide-gray-50">
            {students.map((s) => (
              <div key={s._id} className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-9 h-9 rounded-full bg-primary/30 flex items-center justify-center text-sm font-medium shrink-0">
                    {s.name.split(" ").slice(-1)[0][0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 truncate">{s.email}</p>
                  </div>
                  <span
                    className={
                      "shrink-0 text-[11px] font-medium px-2 py-1 rounded-full " +
                      (s.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500")
                    }
                  >
                    {s.status === "active" ? "Hoạt động" : "Đã khóa"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                  <p>SĐT: {s.phone || "—"}</p>
                  <p>Khóa học: {s.course || "—"}</p>
                  <p className="col-span-2">
                    Tham gia: {formatJoinedDate(s.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs pt-3 border-t border-gray-50">
                  <button
                    onClick={() => openEditModal(s)}
                    className="text-primary-dark font-medium"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleResetPassword(s)}
                    className="text-gray-600 font-medium"
                  >
                    Đặt lại MK
                  </button>
                  <button
                    onClick={() => handleToggleStatus(s)}
                    className="text-red-500 font-medium"
                  >
                    {s.status === "active" ? "Khóa" : "Mở khóa"}
                  </button>
                </div>
              </div>
            ))}

            {students.length === 0 && (
              <p className="px-4 py-8 text-center text-gray-400 text-sm">
                Không tìm thấy học viên phù hợp.
              </p>
            )}
          </div>
        )}

        {/* ---- Phân trang (dùng chung cho cả 2 layout) ---- */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 text-xs rounded-md border border-gray-300 disabled:opacity-40"
            >
              ← Trước
            </button>
            <span className="text-xs text-gray-500">
              Trang {pagination.page}/{pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 text-xs rounded-md border border-gray-300 disabled:opacity-40"
            >
              Sau →
            </button>
          </div>
        )}
      </div>

      <StudentFormModal
        open={modalOpen}
        mode={modalMode}
        student={editingStudent}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        submitting={
          modalMode === "edit"
            ? updateStudent.isPending
            : createStudent.isPending
        }
        apiError={
          (modalMode === "edit"
            ? updateStudent.error?.message
            : createStudent.error?.message) || ""
        }
      />

      <CredentialModal
        open={Boolean(credential)}
        studentName={credential?.name}
        tempPassword={credential?.tempPassword}
        onClose={() => setCredential(null)}
      />
    </div>
  );
}
