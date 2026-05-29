import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/nav/Navigation";

export const metadata: Metadata = {
  title: "Order Supervisor — AI-Powered Order Monitoring",
  description:
    "Long-running AI supervisor that oversees orders from creation to completion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {/* Navigation renders sidebar (desktop) + mobile header + bottom nav */}
        <Navigation />

        <main className="md:ml-[240px] min-h-screen pb-16 md:pb-0">
          <div className="max-w-[1400px] mx-auto p-4 md:p-6">{children}</div>
        </main>
      </body>
    </html>
  );
}
