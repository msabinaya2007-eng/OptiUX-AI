import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { AnalysisProvider } from "@/lib/analysis-context";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OptiUX-AI | AI-Powered UX Evaluation",
  description:
    "Analyze websites, applications, screenshots, and user flows with AI. Discover UX problems and get actionable recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AnalysisProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AnalysisProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
