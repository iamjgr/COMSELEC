import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["300","400","500","600","700","800"] });

export const metadata: Metadata = {
  title: "PAGHIRANG",
  description: "Official Campus Election System — Palawan State University, Narra Campus",
  icons: {
    icon: "/comseleclogo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Rich layered background — always present behind every page */}
        <div className="page-bg" aria-hidden="true">
          <div className="page-bg-inner" />
          <div className="page-bg-lines" />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
