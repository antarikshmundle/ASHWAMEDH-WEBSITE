import type { Metadata, Viewport } from "next";
import { Inter, Rajdhani } from "next/font/google";
import { PublicChrome } from "@/components/layout/public-chrome";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { site } from "@/data/site";
import { baseOpenGraph, siteTitle } from "@/lib/metadata";
import { siteUrl } from "@/lib/site-url";
import "@/styles/globals.css";

// DS-01: Rajdhani (display/UI) + Inter (body), self-hosted via next/font.
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    ...baseOpenGraph,
    title: siteTitle,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#03060b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: Next.js turns off the global smooth scroll during route changes,
    // so navigation jumps to the top instantly while in-page anchors stay smooth.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${rajdhani.variable} ${inter.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <SkipLink />
        <PublicChrome>
          <SiteHeader />
        </PublicChrome>
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <PublicChrome>
          <SiteFooter />
        </PublicChrome>
      </body>
    </html>
  );
}
