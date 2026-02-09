import {
  getPrimaryColor,
  getTheme,
  setTheme as setLocalTheme,
  setPrimaryColor as setLocalPrimaryColor,
} from "@/utils";
import { createSlice } from "@reduxjs/toolkit";

interface ThemeState {
  mode: "light" | "dark";
  primaryColor: string;
}

const initialState: ThemeState = {
  mode: (getTheme() as "light" | "dark") || "light",
  primaryColor: getPrimaryColor() || "#1677ff",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action: { payload: "light" | "dark" }) => {
      state.mode = action.payload;
      setLocalTheme(action.payload);
    },
    setPrimaryColor: (state, action: { payload: string }) => {
      state.primaryColor = action.payload;
      setLocalPrimaryColor(action.payload);
    },
  },
});

export const { setTheme, setPrimaryColor } = themeSlice.actions;
export default themeSlice.reducer;
