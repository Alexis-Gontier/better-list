import { Archivo, Geist_Mono, Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

/**
 * Le titrage. Une grotesque large et lourde, qui donne son caractère à la direction « Obsidienne »
 * là où la couleur reste volontairement neutre — l'identité passe par la typographie et la matière,
 * pas par la teinte (docs/decisions.md, D33).
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const fonts = [inter, archivo, geistMono];
export const fontVariables = fonts.map((font) => font.variable);
