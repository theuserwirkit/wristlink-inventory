"use client"

export const A6_PRINT_CSS = `
  .a6-print-root {
    color: #000;
    background: #fff;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 10pt;
    line-height: 1.35;
  }

  .a6-page {
    width: 105mm;
    min-height: 140mm;
    padding: 2mm;
    box-sizing: border-box;
    color: #000;
    background: #fff;
  }

  .a6-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .a6-logo {
    max-height: 12mm;
    max-width: 28mm;
    object-fit: contain;
  }

  @media print {
    @page {
      size: 105mm 148mm;
      margin: 4mm;
    }

    body {
      margin: 0;
      padding: 0;
      color: #000 !important;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .no-print {
      display: none !important;
    }

    .a6-page {
      width: auto;
      min-height: auto;
      padding: 0;
      page-break-after: always;
      break-after: page;
    }

    .a6-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }
`

export function A6PrintStyles() {
  return <style jsx global>{A6_PRINT_CSS}</style>
}
