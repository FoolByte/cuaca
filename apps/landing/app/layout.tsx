import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weather Data Platform Medan",
  description: "Informasi cuaca Kota Medan — data real-time dari BMKG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
