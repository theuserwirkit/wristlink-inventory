import type { Metadata } from "next"
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google"
import "./landing.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-landing-display",
  weight: ["600", "700", "800"],
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-landing-body",
  weight: ["400", "500", "600", "700"],
})

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://braceled-led-armband.com"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BraceLED – Next Level LED Armband für Events",
  description:
    "Leuchtende Event-Armbänder – ferngesteuert per DMX, App oder Fernbedienung. German Engineering, Versand aus Deutschland.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: siteUrl,
    siteName: "BraceLED",
    locale: "de_DE",
    type: "website",
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${jakarta.variable} ${dmSans.variable} landing-theme`}>
      {children}
    </div>
  )
}
