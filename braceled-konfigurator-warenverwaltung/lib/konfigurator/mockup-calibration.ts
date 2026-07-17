export type WristbandPrintCalibration = {
  left: number
  top: number
  /** Breite der Druckfläche in % der Mock-up-Bildbreite */
  width: number
  /** Höhe der Druckfläche in % der Mock-up-Bildhöhe */
  height: number
  rotateX: number
  rotateZ: number
}

/** Seitenverhältnis des Mock-up-Fotos (ledband-mockup-web.png) */
export const WRISTBAND_MOCKUP_IMAGE_ASPECT = 1024 / 576

/** Reale Druckfläche 3 × 2 cm (Breite × Höhe) – Referenz für Druckfreigabe */
export const WRISTBAND_PRINT_AREA_ASPECT = 3 / 2

export const DEFAULT_WRISTBAND_PRINT_CALIBRATION: WristbandPrintCalibration = {
  left: 37,
  top: 46.25,
  width: 17,
  height: 23.5,
  rotateX: 0,
  rotateZ: 0,
}

export function getPrintOverlayRect(cal: WristbandPrintCalibration) {
  return {
    left: cal.left,
    top: cal.top,
    width: cal.width,
    height: cal.height,
  }
}

export const WRISTBAND_CALIBRATION_STORAGE_KEY = "wristlink-mockup-calibration"

export function loadWristbandCalibration(): WristbandPrintCalibration {
  if (typeof window === "undefined") return DEFAULT_WRISTBAND_PRINT_CALIBRATION
  try {
    const raw = sessionStorage.getItem(WRISTBAND_CALIBRATION_STORAGE_KEY)
    if (!raw) return DEFAULT_WRISTBAND_PRINT_CALIBRATION
    return { ...DEFAULT_WRISTBAND_PRINT_CALIBRATION, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_WRISTBAND_PRINT_CALIBRATION
  }
}

export function saveWristbandCalibration(cal: WristbandPrintCalibration) {
  sessionStorage.setItem(WRISTBAND_CALIBRATION_STORAGE_KEY, JSON.stringify(cal))
}

export function formatCalibrationForCopy(cal: WristbandPrintCalibration): string {
  return `left: ${cal.left}, top: ${cal.top}, width: ${cal.width}, height: ${cal.height}, rotateX: ${cal.rotateX}, rotateZ: ${cal.rotateZ}`
}
