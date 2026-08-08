import "@/styles/globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/providers";
import { fontVariables } from "@/styles/fonts";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", "font-sans", ...fontVariables)}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
