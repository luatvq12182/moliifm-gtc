import { Navigate } from "react-router-dom";
import { isAdminLoggedIn } from "../lib/adminAuth.js";

export default function ProtectedAdminRoute({ children }) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
