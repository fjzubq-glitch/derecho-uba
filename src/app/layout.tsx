import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono, Special_Elite } from "next/font/google";
import AdminShortcut from "@/components/AdminShortcut";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import HeartbeatProvider from "@/components/HeartbeatProvider";
import { AudioProvider } from "@/components/AudioProvider";
import GlobalAudioPlayer from "@/components/GlobalAudioPlayer";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const specialElite = Special_Elite({
  variable: "--font-special-elite",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://derecho-uba-orpin.vercel.app"),
  title: "Derecho UBA — Portal de cursada",
  description:
    "Clases, transcripciones, Lexpodcast y materiales organizados por materia. Contenido de cursada curado para estudiantes de Derecho UBA.",
  applicationName: "Derecho UBA",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    title: "Derecho UBA — Portal de cursada",
    description:
      "Clases, transcripciones, Lexpodcast y materiales organizados por materia. Contenido de cursada curado para estudiantes de Derecho UBA.",
    url: "https://derecho-uba-orpin.vercel.app",
    siteName: "Derecho UBA",
    type: "website",
    locale: "es_AR",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Derecho UBA — Portal de cursada" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Derecho UBA — Portal de cursada",
    description:
      "Clases, transcripciones, Lexpodcast y materiales organizados por materia. Contenido de cursada curado para estudiantes de Derecho UBA.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable} ${specialElite.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        <AudioProvider>
          <AdminShortcut />
          <ServiceWorkerRegister />
          <HeartbeatProvider />
          {children}
          <GlobalAudioPlayer />
        </AudioProvider>
      </body>
    </html>
  );
}
