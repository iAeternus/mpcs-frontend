import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "@/router";
import { Provider } from "react-redux";
import store from "@/store";
import { App as AntdApp } from "antd";
import { App } from "./App";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <AntdApp>
        <App>
          <RouterProvider router={router} />
        </App>
      </AntdApp>
    </Provider>
  </StrictMode>,
);
