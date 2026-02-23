import { AuthPage } from "@/pages/Auth";
import { LoginPage } from "@/pages/Auth/components/Login/LoginPage";
import { RegisterPage } from "@/pages/Auth/components/Register/RegisterPage";
import { Home } from "@/pages/Home/index";
import { UserPage } from "@/pages/User";
import { useAppSelector } from "@/store";
import { selectToken } from "@/store/modules/authStore";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

const RedirectByAuth = () => {
  const token = useAppSelector(selectToken);
  return <Navigate to={token ? "/home" : "/login"} replace />;
};

const RequireAuth = () => {
  const token = useAppSelector(selectToken);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const RedirectIfAuthed = () => {
  const token = useAppSelector(selectToken);
  if (token) return <Navigate to="/home" replace />;
  return <Outlet />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RedirectByAuth />,
  },
  {
    path: "/login",
    element: <RedirectIfAuthed />,
    children: [
      {
        path: "",
        element: <AuthPage />,
        children: [
          {
            index: true,
            element: <LoginPage />,
          },
          {
            path: "register",
            element: <RegisterPage />,
          },
        ],
      },
    ],
  },
  {
    path: "/home",
    element: <RequireAuth />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "user",
        element: <UserPage />,
      },
    ],
  },
  {
    path: "*",
    element: <RedirectByAuth />,
  },
]);

export default router;
