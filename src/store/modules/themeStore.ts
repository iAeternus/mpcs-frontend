import {
  getPrimaryColor,
  getTheme,
  setTheme as setLocalTheme,
  setPrimaryColor as setLocalPrimaryColor,
} from "@/utils";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  primaryColor: string;
}

const initialState: ThemeState = {
  mode: (getTheme() as ThemeMode) ?? "light",
  primaryColor: getPrimaryColor() ?? "#6366f1",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      setLocalTheme(action.payload);
    },

    toggleTheme(state) {
      const next: ThemeMode = state.mode === "light" ? "dark" : "light";
      state.mode = next;
      setLocalTheme(next);
    },

    setPrimaryColor(state, action: PayloadAction<string>) {
      state.primaryColor = action.payload;
      setLocalPrimaryColor(action.payload);
    },
  },
});

export const { setTheme, toggleTheme, setPrimaryColor } = themeSlice.actions;

export default themeSlice.reducer;
