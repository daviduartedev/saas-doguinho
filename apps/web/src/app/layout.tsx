import type { Metadata } from "next";
import { Red_Hat_Display, Red_Hat_Text } from "next/font/google";
import "./globals.css";

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
  title: "Doguinho do Corujá",
  description: "Fechamento diário da quantidade restante",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${text.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
