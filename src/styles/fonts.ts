import { Geist_Mono, Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const fonts = [inter, geistMono];
export const fontVariables = fonts.map((font) => font.variable);
