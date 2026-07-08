"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Menu, X } from "lucide-react"
import { LandingButton } from "@/components/landing/landing-ui"
import { BraceledLogo } from "@/components/landing/braceled-logo"
import { HERO_COPY, NAV_LINKS } from "@/lib/landing/content"
import { EMAIL_INFO } from "@/lib/contact-emails"
import { cn } from "@/lib/utils"

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <header className={cn("lp-nav", scrolled && "lp-nav--scrolled")}>
        <div className="lp-container lp-nav-inner">
          <Link href="/" className="lp-logo-brand" onClick={closeMenu}>
            <BraceledLogo />
          </Link>

          <nav className="lp-nav-links" aria-label="Hauptnavigation">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="lp-nav-actions">
            <LandingButton href="/konfigurator" size="sm" className="lp-nav-cta-desktop">
              {HERO_COPY.ctaPrimary} <ArrowRight size={16} />
            </LandingButton>
            <button
              type="button"
              className="lp-nav-burger"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        <div className="lp-nav-accent" aria-hidden />
      </header>

      <div className={cn("lp-mobile-menu", menuOpen && "open")} aria-hidden={!menuOpen}>
        <div className="lp-mobile-menu-backdrop" onClick={closeMenu} />
        <div className="lp-mobile-menu-panel">
          <nav className="lp-mobile-menu-links">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={closeMenu}>
                {link.label}
              </a>
            ))}
          </nav>
          <LandingButton href="/konfigurator" className="lp-btn-block" onClick={closeMenu}>
            {HERO_COPY.ctaPrimary} <ArrowRight size={18} />
          </LandingButton>
          <a href={`mailto:${EMAIL_INFO}`} className="lp-mobile-menu-mail" onClick={closeMenu}>
            {EMAIL_INFO}
          </a>
        </div>
      </div>
    </>
  )
}
