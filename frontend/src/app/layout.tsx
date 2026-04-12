import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";
import Footer from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Genomic VEP — Variant Effect Predictor",
  description:
    "Predict whether DNA variants are pathogenic or benign using a fine-tuned Nucleotide Transformer with per-token interpretability.",
  openGraph: {
    title: "Genomic VEP — Variant Effect Predictor",
    description:
      "Deep learning variant effect prediction with Nucleotide Transformer v2 and Integrated Gradients interpretability. Trained on ClinVar.",
    type: "website",
    siteName: "Genomic VEP",
  },
  twitter: {
    card: "summary_large_image",
    title: "Genomic VEP — Variant Effect Predictor",
    description:
      "Deep learning variant effect prediction with Nucleotide Transformer v2 and Integrated Gradients interpretability.",
  },
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
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
