import "./globals.css";
import { Fraunces, Space_Grotesk } from "next/font/google";

const displayFont = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata = {
  title: "Admin Pondok",
  description: "Admin utilities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="app-body">{children}</body>
    </html>
  );
}
