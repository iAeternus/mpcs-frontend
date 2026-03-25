import { useAppSelector } from "@/store";
import { selectToken } from "@/store/modules/authStore";
import { Navigate, Outlet } from "react-router-dom";

export const RedirectByAuth = () => {
  const token = useAppSelector(selectToken);
  return <Navigate to={token ? "/home" : "/login"} replace />;
};

export const RequireAuth = () => {
  const token = useAppSelector(selectToken);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const RedirectIfAuthed = () => {
  const token = useAppSelector(selectToken);
  if (token) return <Navigate to="/home" replace />;
  return <Outlet />;
};
