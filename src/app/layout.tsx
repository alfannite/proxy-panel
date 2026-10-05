import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    default: "Traefik ProxyPanel - Advanced Subdomain & Reverse Proxy Manager",
    template: "%s | ProxyPanel"
  },
  description: "A modern, high-performance, and luxury control panel for managing Traefik reverse proxies and automated Cloudflare DNS A-Records.",
  keywords: ["Traefik", "Proxy", "Panel", "Reverse Proxy", "Cloudflare", "DNS", "Subdomain", "Docker", "Automation"],
  authors: [{ name: "Admin" }],
  creator: "ProxyPanel",
  publisher: "ProxyPanel",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: false, // Internal panel, prevent indexing by default for security
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Traefik ProxyPanel Dashboard",
    description: "Manage Traefik routers and automated Cloudflare DNS seamlessly.",
    url: "https://proxypanel.local",
    siteName: "ProxyPanel",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#09090b] text-white min-h-screen antialiased selection:bg-indigo-500/30 overflow-x-hidden relative`}>
        {/* Background glow effects */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
        
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
