import type { Metadata } from "next";
import { Red_Hat_Display, Red_Hat_Text } from "next/font/google";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { doguinhoTheme } from "@/lib/mantine-theme";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "./globals.css";

dayjs.locale("pt-br");

const display = Red_Hat_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const text = Red_Hat_Text({
  subsets: ["latin"],
  variable: "--font-text",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Doguinho do Coruja",
  description: "Fechamento diário da quantidade restante",
  icons: {
    icon: [{ url: "/marca-doguinho.png", type: "image/png" }],
    apple: "/marca-doguinho.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body className={`${display.variable} ${text.variable} font-sans antialiased`}>
        <MantineProvider theme={doguinhoTheme} defaultColorScheme="light" forceColorScheme="light">
          <DatesProvider settings={{ locale: "pt-br" }}>
            {children}
          </DatesProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
