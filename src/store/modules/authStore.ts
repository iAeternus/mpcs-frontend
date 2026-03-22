import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "..";
import store from "..";
import type { MobileOrEmailLoginCommand } from "@/types/login/command";
import { loginWithMobileOrEmailApi } from "@/apis/login";

export interface AuthState {
  token?: string;
}

const initialState: AuthState = {
  token: localStorage.getItem("token") ?? undefined,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      localStorage.setItem("token", action.payload);
    },
    logout(state) {
      state.token = undefined;
      localStorage.removeItem("token");
    },
  },
});

export const { setToken, logout } = authSlice.actions;
export default authSlice.reducer;
export const selectToken = (state: RootState) => state.auth.token;

export const login = (cmd: MobileOrEmailLoginCommand) => {
  return async (dispatch: AppDispatch) => {
    const resp = await loginWithMobileOrEmailApi(cmd);
    dispatch(setToken(resp.token));
    return resp;
  };
};

export const getToken = () => {
  return selectToken(store.getState());
};
