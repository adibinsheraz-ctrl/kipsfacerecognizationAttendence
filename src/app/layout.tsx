import type { Metadata } from "next";
import { Sora, Figtree } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import FirebaseAnalyticsProvider from "@/components/FirebaseAnalyticsProvider";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-VDGGQCSFQ0";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Kips College G-9 Face Attendance",
  description:
    "Premium face recognition attendance system for Kips College G-9. Secure, fast, and built for real campus use.",
  icons: {
    icon: [
      { url: "/kips-favicon.png", type: "image/png" },
    ],
    shortcut: "/kips-favicon.png",
    apple: "/kips-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${figtree.variable} h-full`}>
      <head>
        {/* Google Analytics — gtag.js */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
      </head>
      <body className="min-h-full antialiased">
        <FirebaseAnalyticsProvider>
          {children}
        </FirebaseAnalyticsProvider>
      </body>
    </html>
  );
}
