import type { CSSProperties, ReactNode } from "react"

const CHECKERBOARD_STYLE: CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, #d4d4d8 25%, transparent 25%),
    linear-gradient(-45deg, #d4d4d8 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d4d4d8 75%),
    linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)
  `,
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
  backgroundColor: "#fafafa",
}

export function CheckerboardBg({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className} style={CHECKERBOARD_STYLE}>
      {children}
    </div>
  )
}
