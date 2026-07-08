import Image from "next/image"
import Link from "next/link"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

export function FestivaTitle({
  kicker,
  title,
  align = "left",
  light = false,
}: {
  kicker: string
  title: ReactNode
  align?: "left" | "center"
  light?: boolean
}) {
  return (
    <div className={cn("lp-festiva-title", align === "center" && "center", light && "light")}>
      <Image src="/images/landing/line-deco.png" alt="" width={60} height={8} className="lp-title-line" aria-hidden />
      <p className="lp-festiva-kicker">{kicker}</p>
      <h2 className="lp-festiva-heading">{title}</h2>
    </div>
  )
}

export function LandingButton({
  href,
  children,
  variant = "primary",
  size = "default",
  className,
  onClick,
}: {
  href: string
  children: ReactNode
  variant?: "primary" | "ghost" | "outline-white"
  size?: "default" | "sm" | "lg"
  className?: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "lp-btn",
        variant === "primary" && "lp-btn-primary",
        variant === "ghost" && "lp-btn-ghost",
        variant === "outline-white" && "lp-btn-outline-white",
        size === "sm" && "lp-btn-sm",
        size === "lg" && "lp-btn-lg",
        className,
      )}
    >
      {children}
    </Link>
  )
}

export function SectionHeader({
  label,
  title,
  subtitle,
}: {
  label?: string
  title: ReactNode
  subtitle?: string
}) {
  return (
    <div className="lp-section-header">
      {label && <FestivaTitle kicker={label} title={title} align="center" light />}
      {!label && <h2 className="lp-festiva-heading center-only">{title}</h2>}
      {subtitle && <p className="lp-section-sub">{subtitle}</p>}
    </div>
  )
}
