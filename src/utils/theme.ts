const THEME = "theme";

const PRIMARY_COLOR = "primaryColor";

export const setTheme = (theme: string) => {
  localStorage.setItem(THEME, theme);
};

export const getTheme = () => {
  return localStorage.getItem(THEME);
};

export const setPrimaryColor = (primaryColor: string) => {
  localStorage.setItem(PRIMARY_COLOR, primaryColor);
};

export const getPrimaryColor = () => {
  return localStorage.getItem(PRIMARY_COLOR);
};
