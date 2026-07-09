export type WristlinkProdukt = "armband" | "zauberstab" | "licht"
export type WristlinkModus = "kauf" | "miete"
export type WristlinkStation = "keine" | "eco" | "pro"
export type WristlinkLieferzeit = "standard" | "express" | "hyperexpress"

export type PreisEngineInput = {
  produkt: WristlinkProdukt | string
  modus: WristlinkModus | string
  menge: number
  druck?: boolean
  druckArt?: string
  gruppen?: number
  station?: WristlinkStation | string
  stationModus?: WristlinkModus | string
  lieferpaket?: string
  flexRueckgabe?: boolean
  lieferzeit?: WristlinkLieferzeit | string
  land?: string
  von?: string
  bis?: string
  variante?: string
  flex?: boolean
  probedruckOption?: string
  probedruck?: boolean
  techniker?: boolean
  technikerTage?: number
  technikerKm?: number
}

export type PreisPosition = {
  pos: string
  menge: number
  einzel: number
  summe: number
}

export type PreisEngineSuccess = {
  gueltig: true
  eingabe: {
    produkt: string
    modus: string
    menge: number
    variante: string
    druck: boolean
    probedruck: boolean
    probedruckOption: string
    flex: boolean
    lieferpaket: string
    flexRueckgabe: boolean
    gruppen: number
    station: string
    stationModus: string
    lieferzeit: string
    land: string
    techniker: boolean
    technikerTage: number
    technikerKm: number
  }
  positionen: PreisPosition[]
  gesamt_netto: number
  mwst_19: number
  gesamt_brutto: number
}

export type PreisEngineError = {
  gueltig: false
  fehler: string[]
}

export type PreisEngineResult = PreisEngineSuccess | PreisEngineError
