import { AuthPage } from "@/pages/Auth";
import { LoginPage } from "@/pages/Auth/components/Login/LoginPage";
import { RegisterPage } from "@/pages/Auth/components/Register/RegisterPage";
import { Home } from "@/pages/Home/index";
import { createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/login",
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
  {
    path: "/",
    element: <Home />,
    children: [], // TODO: 子页面加在这里
  },
]);

export default router;
