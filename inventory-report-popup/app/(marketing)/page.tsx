import { LandingPage } from "@/components/landing/landing-page"
import { getLandingPricing } from "@/lib/landing/pricing"

export default function LandingPageRoute() {
  const pricing = getLandingPricing()

  return <LandingPage pricing={pricing} />
}
