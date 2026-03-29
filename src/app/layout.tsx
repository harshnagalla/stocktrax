import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockTrax — Adam Khoo Stock Analysis Dashboard",
  description:
    "VMI scoring, technical analysis, and market sentiment powered by Adam Khoo's methodology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        {children}
      </body>
    </html>
  );
}
