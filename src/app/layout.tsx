import type { Metadata, Viewport } from "next";
import { Archivo, Hanken_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/layout/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getBaseUrl } from "@/lib/env";

// next/font exposes each face under a private --nf-* name; globals.css maps
// them onto Tailwind's --font-* theme keys. Sharing one name made the theme
// variable reference itself, which is why font-archivo etc. never worked.
const archivo = Archivo({
  variable: "--nf-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--nf-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--nf-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "NXT Speaker — Book Speakers Directly",
    template: "%s | NXT Speaker",
  },
  description:
    "South Africa's disruptive speaker booking platform. Discover and book world-class speakers directly — no agencies, no gatekeepers.",
  keywords: [
    "speaker booking",
    "keynote speakers",
    "South Africa speakers",
    "corporate speakers",
    "book a speaker",
    "NXT Speaker",
    "event speakers",
    "motivational speakers South Africa",
  ],
  openGraph: {
    siteName: "NXT Speaker",
    type: "website",
    locale: "en_ZA",
    title: "NXT Speaker — Book Speakers Directly",
    description:
      "South Africa's disruptive speaker booking platform. No agencies, no gatekeepers.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "NXT Speaker — Book Speakers Directly" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NXT Speaker — Book Speakers Directly",
    description:
      "Discover and book world-class speakers directly. No agencies, no gatekeepers.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: "#031E57",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NXT Speaker",
  description:
    "South Africa's disruptive speaker booking platform connecting event organisers directly with world-class speakers — no agencies, no gatekeepers.",
  url: baseUrl,
  logo: `${baseUrl}/logoMark_navy.png`,
  areaServed: "ZA",
  knowsAbout: ["Speaker Booking", "Event Management", "Corporate Events", "Keynote Speakers"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${archivo.variable} ${hanken.variable} ${spaceMono.variable}`}>
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
