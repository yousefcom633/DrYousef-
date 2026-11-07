import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "مهمات Dr.Yousef · Dr.Yousef Tasks",
  description: "تطبيق إدارة مهام محفّز: أنجز، اكسب نجوم، افتح مكافآتك. Gamified task manager with stars, rewards and focus timer.",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icons/icon.svg", type: "image/svg+xml" }] },
  appleWebApp: { capable: true, title: "Dr.Yousef Tasks", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F6FA",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
