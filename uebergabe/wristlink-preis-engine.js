// ============================================================
// WIRKUNG Wristlink – Preis-Engine
// n8n Code-Node | Modus: "Run Once for All Items"
// ============================================================
//
// Erwartete Eingabefelder pro Item (aus der KI-Extraktion):
//   produkt:    'armband' | 'zauberstab' | 'licht'
//   modus:      'kauf' | 'miete'
//   menge:      Zahl 100..2500 (Schritte 50)
//   druck:      boolean
//   gruppen:    Zahl 0..20
//   station:    'keine' | 'eco' | 'pro'
//   stationModus: 'kauf' | 'miete'  (unabhängig vom Produktmodus; PRO nur miete)
//   lieferzeit: 'standard' | 'express' | 'hyperexpress'
//   land:       'DE'   (aktuell nur Deutschland)
//
// Rückgabe:
//   { gueltig: true,  positionen: [...], gesamt_netto, mwst_19, gesamt_brutto }
//   { gueltig: false, fehler: [...] }   -> im IF-Node in Rückfrage-Strecke leiten
// ============================================================

// ---- Preistabellen [min, max, kauf, miete] ----
const PREISE = {
  armband:    [[100,300,4.20,3.90],[301,500,3.98,3.85],[501,1000,3.83,3.82],[1001,2500,3.76,3.80]],
  zauberstab: [[100,300,4.10,3.90],[301,500,3.89,3.85],[501,1000,3.74,3.82],[1001,2500,3.66,3.80]],
  licht:      [[100,300,4.90,3.95],[301,500,4.89,3.90],[501,1000,4.74,3.85],[1001,2500,4.66,3.80]],
};

// ---- Druck (nur Kauf) [min, max, eur_pro_stueck] ----
const DRUCK_PRO_STK = [[100,300,2.12],[301,500,1.80],[501,1000,0.97],[1001,2500,0.95]];
const DRUCK_SETUP   = 120.00;

// ---- Pauschalen ----
const GRUPPE     = 65.00;
const STATION_KAUF  = { keine: 0, eco: 399.00, pro: 0 };
const STATION_MIETE = { keine: 0, eco: 250.00, pro: 649.00 };
const LIEFERZEIT = { standard: 79.00, express: 349.00, hyperexpress: 620.00 };
const VERSAND    = { DE: 90.00 };

function stationPreis(station, modus) {
  const s = String(station || 'keine').toLowerCase();
  const m = String(modus || '').toLowerCase();
  if (s === 'keine') return 0;
  return m === 'kauf' ? (STATION_KAUF[s] || 0) : (STATION_MIETE[s] || 0);
}

const eur = (n) => Math.round(n * 100) / 100;

function tier(tabelle, menge, spalte) {
  const row = tabelle.find(r => menge >= r[0] && menge <= r[1]);
  return row ? row[spalte] : null;
}

function rechne(input) {
  const produkt    = String(input.produkt || '').toLowerCase();
  const modus      = String(input.modus || '').toLowerCase();
  const menge      = Number(input.menge);
  const druck      = Boolean(input.druck);
  const gruppen    = Number(input.gruppen || 0);
  const station    = String(input.station || 'keine').toLowerCase();
  const stationModusRaw = String(input.stationModus || input.modus || 'miete').toLowerCase();
  const stationModus = station === 'pro' ? 'miete' : stationModusRaw;
  const lieferzeit = String(input.lieferzeit || '').toLowerCase();
  const land       = String(input.land || 'DE').toUpperCase();

  // ---- Validierung / Geschäftsregeln ----
  const fehler = [];
  if (!PREISE[produkt])                        fehler.push(`Unbekanntes Produkt: "${input.produkt}"`);
  if (!['kauf','miete'].includes(modus))       fehler.push(`Modus muss "kauf" oder "miete" sein`);
  if (!Number.isFinite(menge) || menge < 100 || menge > 2500)
                                               fehler.push(`Menge ${input.menge} außerhalb 100–2500`);
  if (Number.isFinite(menge) && menge % 50 !== 0)
                                               fehler.push(`Menge muss in 50er-Schritten liegen`);
  if (gruppen < 0 || gruppen > 20)             fehler.push(`Gruppen ${gruppen} außerhalb 0–20`);
  if (gruppen > 0 && station !== 'pro')        fehler.push(`Gruppenprogrammierung nur mit PRO-Basis-Station`);
  if (druck && modus === 'miete')              fehler.push(`Druck ist nur beim Kauf möglich`);
  if (druck && lieferzeit === 'hyperexpress')  fehler.push(`Druck bei Hyperexpress nicht möglich`);
  if (station === 'pro' && stationModusRaw === 'kauf') fehler.push(`PRO-Basis-Station ist nur zur Miete verfügbar`);
  if (station !== 'keine' && !['kauf','miete'].includes(stationModus)) fehler.push(`Basis-Station-Modus muss "kauf" oder "miete" sein`);
  if (!['keine','eco','pro'].includes(station)) fehler.push(`Unbekannte Basis-Station: "${input.station}"`);
  if (!LIEFERZEIT.hasOwnProperty(lieferzeit))  fehler.push(`Unbekannte Lieferzeit: "${input.lieferzeit}"`);
  if (!VERSAND.hasOwnProperty(land))           fehler.push(`Versand nur nach: ${Object.keys(VERSAND).join(', ')}`);

  if (fehler.length) return { gueltig: false, fehler };

  // ---- Positionen aufbauen ----
  const spalte      = modus === 'kauf' ? 2 : 3;
  const stueckpreis = tier(PREISE[produkt], menge, spalte);
  const positionen  = [];

  positionen.push({
    pos:    `LED ${produkt} (${modus})`,
    menge,  einzel: stueckpreis,  summe: eur(menge * stueckpreis),
  });

  if (druck && modus === 'kauf') {
    const dp = tier(DRUCK_PRO_STK, menge, 2);
    positionen.push({ pos: 'Druck – Setup-/Abwicklungsgebühr', menge: 1, einzel: DRUCK_SETUP, summe: DRUCK_SETUP });
    positionen.push({ pos: 'Druck – pro Stück',                menge,    einzel: dp,          summe: eur(menge * dp) });
  }

  if (gruppen > 0) {
    positionen.push({ pos: 'Gruppenprogrammierung', menge: gruppen, einzel: GRUPPE, summe: eur(gruppen * GRUPPE) });
  }

  const stPreis = stationPreis(station, stationModus);
  if (stPreis > 0) {
    const stationLabel = station === 'eco'
      ? `ECO Handcontroller (${stationModus === 'kauf' ? 'Kauf' : 'Miete'})`
      : 'PRO Basis-Station (Miete)';
    positionen.push({ pos: stationLabel, menge: 1, einzel: stPreis, summe: stPreis });
  }

  positionen.push({ pos: `Lieferzeit (${lieferzeit})`, menge: 1, einzel: LIEFERZEIT[lieferzeit], summe: LIEFERZEIT[lieferzeit] });
  positionen.push({ pos: `Versand ${land}`,            menge: 1, einzel: VERSAND[land],          summe: VERSAND[land] });

  // ---- Summen ----
  const gesamt_netto  = eur(positionen.reduce((s, p) => s + p.summe, 0));
  const mwst_19       = eur(gesamt_netto * 0.19);   // <- nur falls deine Preise NETTO sind; sonst Zeile entfernen
  const gesamt_brutto = eur(gesamt_netto + mwst_19);

  return { gueltig: true, eingabe: { produkt, modus, menge, druck, gruppen, station, stationModus, lieferzeit, land },
           positionen, gesamt_netto, mwst_19, gesamt_brutto };
}

return $input.all().map(item => ({ json: rechne(item.json) }));
