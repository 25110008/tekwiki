import type { Metadata } from "next";
import { Suspense } from "react";
import { Noto_Serif_JP, IBM_Plex_Sans_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  weight: ["600", "700"],
  subsets: ["latin"],
});

const plexSansJP = IBM_Plex_Sans_JP({
  variable: "--font-plex-sans-jp",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "テクWiki",
  description: "社内Wiki統合ツール「テクWiki」",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${notoSerifJP.variable} ${plexSansJP.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <AuthProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
