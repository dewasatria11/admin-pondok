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
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        {/* Anti-flash for tailwind */}
        <script dangerouslySetInnerHTML={{
          __html: `
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  slate: { 800: '#1e293b', 900: '#0f172a' },
                  cyan: { 400: '#22d3ee', 500: '#06b6d4' }
                }
              }
            }
          }
        `}} />
      </head>
      <body className="app-body">{children}</body>
    </html>
  );
}
