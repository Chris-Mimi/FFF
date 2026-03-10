// Forge Functional Fitness - Main Layout
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1a1a2e",
};

export const metadata: Metadata = {
  title: "The Forge - Functional Fitness",
  description: "CrossFit gym management and athlete tracking",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "The Forge - Functional Fitness",
    description: "CrossFit gym management and athlete tracking",
    siteName: "The Forge",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "The Forge - Functional Fitness",
    description: "CrossFit gym management and athlete tracking",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster position="top-center" richColors closeButton />
        <ConfirmDialog />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
