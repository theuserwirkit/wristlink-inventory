"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

export function LandingFaq({ items }: { items: readonly { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="lp-faq-list">
      {items.map((item, i) => (
        <div key={item.question} className="lp-faq-item" data-open={open === i}>
          <button
            type="button"
            className="lp-faq-trigger"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span>{item.question}</span>
            <ChevronDown size={20} />
          </button>
          {open === i && <div className="lp-faq-content">{item.answer}</div>}
        </div>
      ))}
    </div>
  )
}
