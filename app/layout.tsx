import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caliber",
  description:
    "Digital Employee Competency Assessment Platform — Caliber",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
