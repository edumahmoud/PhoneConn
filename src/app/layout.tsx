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
  title: "PhoneConn | مركز التواصل مع راوتر شبكتك الحقيقية",
  description:
    "أداة توعوية تعمل من متصفح هاتفك: حدد عنوان راوتر شبكتك المحلية، افتح لوحة التحكم مباشرة، استعرض بيانات المصنّعين وبيانات الدخول الافتراضية، وأجرِ تدقيقاً أمنياً تفاعلياً لشبكتك المنزلية — خصوصية كاملة دون أي سيرفر خارجي.",
  keywords: [
    "الراوتر",
    "لوحة تحكم الراوتر",
    "أمان الشبكة المنزلية",
    "192.168.1.1",
    "كلمة مرور الواي فاي",
    "WPA3",
    "router security",
    "wifi security audit",
  ],
  authors: [{ name: "PhoneConn" }],
  openGraph: {
    title: "PhoneConn | مركز التواصل مع الراوتر الحقيقي",
    description: "افتح لوحة تحكم راوترك من هاتفك وتدقق أمان شبكتك المنزلية خطوة بخطوة",
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
