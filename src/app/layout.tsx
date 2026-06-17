import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/layout/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getBaseUrl } from "@/lib/env";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "NxtSpeaker — Africa's Premier Speaker Platform",
    template: "%s | NxtSpeaker",
  },
  description:
    "Connect with world-class speakers who drive transformation across Africa. Luxury speaker booking and hospitality platform.",
  openGraph: {
    siteName: "NxtSpeaker",
    type: "website",
    locale: "en_ZA",
    title: "NxtSpeaker — Africa's Premier Speaker Platform",
    description:
      "Connect with world-class speakers who drive transformation across Africa. Luxury speaker booking and hospitality platform.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "NxtSpeaker — Africa's Premier Speaker Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NxtSpeaker — Africa's Premier Speaker Platform",
    description:
      "Connect with world-class speakers who drive transformation across Africa.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/icon.svg",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NxtSpeaker",
  description:
    "Africa's premier luxury speaker booking and hospitality platform connecting world-class speakers with event organisers.",
  url: baseUrl,
  logo: `${baseUrl}/icon.svg`,
  areaServed: "ZA",
  knowsAbout: ["Speaker Booking", "Event Management", "Corporate Events", "Keynote Speakers"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
