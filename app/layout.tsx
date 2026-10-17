import type { Metadata } from "next";
import "./styles.css";
import "./welcome.css";
import "./visual-design.css";
import "./business-design.css";
import "./business-story.css";
import {LanguageProvider} from "./i18n";
import "./localization.css";
import "./brand-logo.css";
import {brand} from "./brand";

export const metadata: Metadata = {
  title: `${brand.name} | Let AI handle the busywork`,
  metadataBase: new URL(brand.url),
  applicationName: brand.name,
  openGraph: {title: `${brand.name} | Less busywork. Better business.`, siteName: brand.name, type: "website"},
  description: "Website design, marketing support, and affordable business automation for local shops and small service companies in the US and UK. Explore marketing, customer communication, bookings, payments, and everyday operations with a free one-to-one business discussion.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}

