import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stayzy — Your space. Your schedule.",
  description:
    "Find a comfortable stay for an hour, a day, or a little longer. Flexible PG and private room booking with transparent pricing.",
  keywords: "PG booking, flexible stay, hourly room, monthly PG, coliving, Stayzy",
  authors: [{ name: "Stayzy Hospitality" }],
};

import { ClientDataSync } from "@/components/common/ClientDataSync";
import { Navbar } from "@/components/common/Navbar";
import { FloatingContactButtons } from "@/components/common/FloatingContactButtons";
import { ToastProvider } from "@/components/ui/Toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-white text-[#111827] selection:bg-emerald-100 selection:text-emerald-950">
        <ToastProvider>
          <ClientDataSync />
          <Navbar />
          <div className="flex-1 flex flex-col min-w-0">{children}</div>
          <FloatingContactButtons />
        </ToastProvider>
      </body>
    </html>
  );
}
