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

const mustard: MantineColorsTuple = [
  "#fff8e8",
  "#fbeec0",
  "#f6de8a",
  "#f0cd54",
  "#e8c02e",
  "#e4ba26",
  "#e0b322",
  "#c49c1c",
  "#a07e16",
  "#7c6111",
];

export const doguinhoTheme = createTheme({
  primaryColor: "ketchup",
  colors: { ketchup, mustard },
  fontFamily: "var(--font-text), sans-serif",
  headings: { fontFamily: "var(--font-display), sans-serif" },
  defaultRadius: "md",
  radius: {
    xs: "8px",
    sm: "8px",
    md: "10px",
    lg: "12px",
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
    DatePickerInput: {
      defaultProps: {
        color: "ketchup",
        radius: "md",
      },
      styles: {
        label: {
          color: "var(--steam)",
          fontSize: "12px",
          fontWeight: 500,
          marginBottom: "4px",
        },
        input: {
          backgroundColor: "var(--control)",
          borderColor: "var(--border)",
          color: "var(--ink)",
          fontSize: "14px",
          minHeight: "36px",
          height: "36px",
        },
      },
    },
    Calendar: {
      styles: {
        calendarHeader: {
          color: "var(--ink)",
        },
        calendarHeaderControl: {
          color: "var(--ink)",
        },
        weekday: {
          color: "var(--steam)",
        },
        day: {
          color: "var(--ink)",
        },
        month: {
          backgroundColor: "var(--sheet)",
        },
      },
    },
  },
});
