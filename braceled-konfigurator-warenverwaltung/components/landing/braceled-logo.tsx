"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

type Props = {
  className?: string
  showByline?: boolean
  size?: "nav" | "footer"
}

export function BraceledLogo({ className, showByline = true, size = "nav" }: Props) {
  const gradId = useId()

  return (
    <div className={cn("lp-braceled-logo", size === "footer" && "lp-braceled-logo--footer", className)}>
      <svg
        className="lp-braceled-icon"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2bb2fc" />
            <stop offset="0.55" stopColor="#7c4dff" />
            <stop offset="1" stopColor="#e040fb" />
          </linearGradient>
        </defs>
        <path
          d="M14 8h12.5c6.9 0 11.5 3.8 11.5 9.6 0 3.6-1.8 6.4-4.8 7.8 3.8 1.2 6.3 4.4 6.3 8.8 0 6.2-5.1 10.8-12.8 10.8H14V8Z"
          stroke={`url(#${gradId})`}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path
          d="M14 24.2h11.8c3.4 0 5.6-1.6 5.6-4.3 0-2.6-2.2-4.1-5.6-4.1H14"
          stroke={`url(#${gradId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="36" cy="12" r="2" fill="#2bb2fc" />
        <circle cx="40" cy="34" r="2" fill="#e040fb" />
      </svg>
      <div className="lp-braceled-wordmark">
        <span className="lp-braceled-word">
          BRACE<span className="lp-braceled-led">LED</span>
        </span>
        {showByline && <span className="lp-logo-byline">by WIRKUNG digital</span>}
      </div>
    </div>
  )
}
