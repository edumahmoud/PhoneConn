import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PhoneConn | مختبر الأمن السيبراني التعليمي المحاكى",
  description:
    "منصة تعليمية تفاعلية لمحاكاة اختبارات اختراق الشبكات والأجهزة المحمولة في بيئة افتراضية معزولة — لنشر الوعي والثقافة الأمنية. جميع الشبكات والأجهزة محاكاة وليست حقيقية.",
  keywords: [
    "الأمن السيبراني",
    "اختبار الاختراق",
    "التوعية الأمنية",
    "محاكاة",
    "تعليم",
    "cybersecurity",
    "pentest lab",
    "security awareness",
  ],
  authors: [{ name: "PhoneConn EduLab" }],
  openGraph: {
    title: "PhoneConn | مختبر الأمن السيبراني التعليمي",
    description: "مختبر افتراضي آمن لمحاكاة سيناريوهات اختبار الاختراق والوعي الأمني",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
