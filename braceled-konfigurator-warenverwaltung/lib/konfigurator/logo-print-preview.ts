export type PrintPreviewResult = {
  dataUrl: string
  whitePixelsRemoved: number
}

/** Pixel gelten als „Weiß“ (nicht druckbar) – inkl. leicht abweichender Hintergrundtöne */
export function isNonPrintableWhite(r: number, g: number, b: number, a: number): boolean {
  if (a < 8) return false
  const min = Math.min(r, g, b)
  const max = Math.max(r, g, b)
  return min >= 232 && max - min <= 20
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Logo konnte nicht geladen werden"))
    img.src = url
  })
}

/** Entfernt weiße Pixel für die Druckvorschau (erscheinen transparent). */
export async function createPrintPreviewFromUrl(sourceUrl: string): Promise<PrintPreviewResult> {
  const img = await loadImage(sourceUrl)
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas nicht verfügbar")

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData
  let whitePixelsRemoved = 0

  for (let i = 0; i < data.length; i += 4) {
    if (isNonPrintableWhite(data[i], data[i + 1], data[i + 2], data[i + 3])) {
      data[i + 3] = 0
      whitePixelsRemoved++
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return {
    dataUrl: canvas.toDataURL("image/png"),
    whitePixelsRemoved,
  }
}
