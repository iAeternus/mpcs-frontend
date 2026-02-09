import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import themeReducer from "./modules/themeStore";
import authReducer from "./modules/authStore";

const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
  },
});

// 导出 RootState 类型
export type RootState = ReturnType<typeof store.getState>;

// 导出 AppDispatch 类型
export type AppDispatch = typeof store.dispatch;

// 导出类型安全的 hooks
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export default store;
