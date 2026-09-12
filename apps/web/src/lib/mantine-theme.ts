import { createTheme, type MantineColorsTuple } from "@mantine/core";

const ketchup: MantineColorsTuple = [
  "#fff1f1",
  "#ffd6d7",
  "#f9a8aa",
  "#f37275",
  "#ed4549",
  "#e85a5e",
  "#e31c23",
  "#c4161c",
  "#a51218",
  "#870e13",
];

export const doguinhoTheme = createTheme({
  primaryColor: "ketchup",
  colors: { ketchup },
  fontFamily: "var(--font-text), sans-serif",
  headings: { fontFamily: "var(--font-display), sans-serif" },
  defaultRadius: "md",
  radius: {
    xs: "6px",
    sm: "6px",
    md: "8px",
    lg: "10px",
    xl: "999px",
  },
  white: "#fffdf9",
  black: "#241710",
  cursorType: "pointer",
  components: {
    Button: {
      defaultProps: {
        radius: "md",
        fw: 600,
      },
    },
    Pagination: {
      defaultProps: {
        color: "ketchup",
        radius: "xl",
        size: "sm",
        withEdges: false,
        autoContrast: true,
      },
    },
    Switch: {
      defaultProps: {
        color: "ketchup",
        size: "sm",
      },
    },
  },
});
