import { AuthPage } from "@/pages/Auth";
import { LoginPage } from "@/pages/Auth/components/Login/LoginPage";
import { RegisterPage } from "@/pages/Auth/components/Register/RegisterPage";
import { Home } from "@/pages/Home/index";
import { useAppSelector } from "@/store";
import { selectToken } from "@/store/modules/authStore";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

const RequireAuth = () => {
  const token = useAppSelector(selectToken);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const RedirectIfAuthed = () => {
  const token = useAppSelector(selectToken);
  if (token) return <Navigate to="/" replace />;
  return <Outlet />;
};

const router = createBrowserRouter([
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
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        index: true,
        element: <Home />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default router;
