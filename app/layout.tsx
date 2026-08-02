import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import HamburgerMenu from "@/components/HamburgerMenu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Household",
  description: "Family household app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <HamburgerMenu />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
