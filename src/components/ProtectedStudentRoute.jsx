import { Navigate } from "react-router-dom";
import { isStudentLoggedIn } from "../lib/studentAuth.js";

export default function ProtectedStudentRoute({ children }) {
  if (!isStudentLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
