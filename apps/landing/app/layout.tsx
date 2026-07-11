import type { Metadata } from "next";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cuaca Medan — Weather Data Platform",
    template: "%s | Cuaca Medan",
  },
  description:
    "Platform data cuaca Kota Medan — informasi real-time dari BMKG. Suhu, kelembaban, curah hujan, dan prediksi cuaca untuk 21 kecamatan.",
  keywords: ["cuaca", "medan", "weather", "BMKG", "forecast", "Indonesia"],
  openGraph: {
    title: "Cuaca Medan — Weather Data Platform",
    description:
      "Informasi cuaca real-time Kota Medan dari BMKG. Suhu, kelembaban, curah hujan untuk 21 kecamatan.",
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
