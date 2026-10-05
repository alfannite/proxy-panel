import { Metadata } from "next";

// 1. INI ADALAH TEKNIK SEO TERBAIK DI NEXT.JS (App Router)
// Metadata ini akan otomatis di-render menjadi tag <title>, <meta description>, OpenGraph (buat share WhatsApp/FB), dan Twitter Cards.
export const metadata: Metadata = {
  title: "Login - ProxyPanel | Traefik Proxy Manager",
  description: "Secure login portal for ProxyPanel. Manage your Traefik reverse proxy, domains, and SSL certificates efficiently.",
  keywords: ["Proxy", "Traefik", "Docker", "Panel", "Management"],
  openGraph: {
    title: "Login - ProxyPanel",
    description: "Secure login portal for ProxyPanel.",
    type: "website",
    siteName: "ProxyPanel",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
