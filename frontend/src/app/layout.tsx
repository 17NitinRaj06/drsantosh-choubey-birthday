import type { Metadata } from "next";
import { EB_Garamond, Inter, Noto_Serif_Devanagari, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  variable: "--font-hindi-display",
  subsets: ["devanagari"],
  weight: ["400"],
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-hindi-body",
  subsets: ["devanagari"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Happy Birthday, Santosh Choubey Ji | 71 Years of Purpose",
  description:
    "A tribute to Santosh Choubey Ji on his 71st birthday. Founder and Chairman of the AISECT Group, journalist, author, and champion of rural education.",
  openGraph: {
    title: "Happy Birthday, Santosh Choubey Ji",
    description: "71 years of purpose, education, and literature.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${inter.variable} ${notoSerifDevanagari.variable} ${notoSansDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col grain">{children}</body>
    </html>
  );
}
