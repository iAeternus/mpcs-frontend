import { AuthPage } from "@/pages/Auth";
import { LoginPage } from "@/pages/Auth/components/Login/LoginPage";
import { RegisterPage } from "@/pages/Auth/components/Register/RegisterPage";
import CollaborationPage from "@/pages/Collaboration";
import { Home } from "@/pages/Home/index";
import { UserPage } from "@/pages/User";
import { createBrowserRouter } from "react-router-dom";
import {
  RedirectByAuth,
  RedirectIfAuthed,
  RequireAuth,
} from "./guards";

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
      {
        path: "collaboration",
        element: <CollaborationPage />,
      },
    ],
  },
  {
    path: "*",
    element: <RedirectByAuth />,
  },
]);

export default router;
