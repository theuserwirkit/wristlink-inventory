"use client"

import Image from "next/image"
import { PrintPreviewLogoImage } from "@/components/konfigurator/print-preview-logo"
import { WRISTBAND_MOCKUP_URL } from "@/lib/konfigurator/product-info"
import {
  DEFAULT_WRISTBAND_PRINT_CALIBRATION,
  getPrintOverlayRect,
} from "@/lib/konfigurator/mockup-calibration"

const cal = DEFAULT_WRISTBAND_PRINT_CALIBRATION
const overlay = getPrintOverlayRect(cal)

export function WristbandMockup({
  printPreviewUrl,
  previewLoading,
}: {
  printPreviewUrl: string | null
  previewLoading?: boolean
}) {
  return (
    <div className="rounded-lg border overflow-hidden bg-black">
      <p className="text-[10px] uppercase tracking-wider text-zinc-400 text-center py-2 bg-zinc-950 border-b border-zinc-800">
        Produkt-Mock-up
      </p>
      <div className="relative w-full">
        <Image
          src={WRISTBAND_MOCKUP_URL}
          alt="LED Armband"
          width={1024}
          height={576}
          className="w-full h-auto block"
          unoptimized
          priority
        />
        <div
          className="absolute overflow-hidden pointer-events-none"
          style={{
            left: `${overlay.left}%`,
            top: `${overlay.top}%`,
            width: `${overlay.width}%`,
            height: `${overlay.height}%`,
            transform: `perspective(600px) rotateX(${cal.rotateX}deg) rotateZ(${cal.rotateZ}deg)`,
            transformOrigin: "center center",
          }}
        >
          {printPreviewUrl || previewLoading ? (
            <PrintPreviewLogoImage
              previewUrl={printPreviewUrl}
              loading={Boolean(previewLoading)}
              alt="Logo auf dem Armband"
              className="block h-full w-full object-contain"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
