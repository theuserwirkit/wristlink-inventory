"use client"

import { useEffect } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import type { BookingWithRelations } from "@/lib/types"

interface RentalProtocolProps {
  booking: BookingWithRelations
}

export function RentalProtocol({ booking }: RentalProtocolProps) {
  useEffect(() => {
    // Auto-print dialog after a short delay
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const ausgabeDatum = booking.datum_ausgabe
    ? format(new Date(booking.datum_ausgabe), "dd.MM.yyyy", { locale: de })
    : "-"
  const rueckgabeDatum = booking.datum_rueckgabe_geplant
    ? format(new Date(booking.datum_rueckgabe_geplant), "dd.MM.yyyy", { locale: de })
    : "-"
  const kundenName = booking.customer?.name || "-"

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-white p-8 max-w-[210mm] mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-wristlink-navy">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-wristlink-navy">
              wirkung.<span className="text-wristlink-purple">wristlink</span>
            </h1>
            <div className="text-right text-sm text-gray-600">
              <div>Buchungs-ID: #{booking.id}</div>
              <div>Erstellt: {booking.created_at ? format(new Date(booking.created_at), "dd.MM.yyyy HH:mm", { locale: de }) : "-"}</div>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">Ausgabe/Rückgabeprotokoll</h2>
        </div>

        {/* Customer and Dates */}
        <div className="mb-8 grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-semibold text-gray-600 mb-1">Kunde:</div>
            <div className="text-lg font-medium">{kundenName}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-600 mb-1">Vermietete Baender:</div>
            <div className="text-lg font-medium">
              {booking.items?.filter((i) => i.group).reduce((sum, item) => sum + item.anzahl, 0) || 0} Stueck
            </div>
          </div>
          {booking.items?.some((i) => i.base) && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-1">Vermietete Basen:</div>
              <div className="text-lg font-medium">
                {booking.items?.filter((i) => i.base).reduce((sum, item) => sum + (item.anzahl_basen || 0), 0) || 0} Stueck
              </div>
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-gray-600 mb-1">Ausgabe:</div>
            <div className="text-lg font-medium">{ausgabeDatum}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-600 mb-1">Geplante Rückgabe:</div>
            <div className="text-lg font-medium">{rueckgabeDatum}</div>
          </div>
        </div>

        {/* Bands per Group */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Baender je Gruppe:</h3>
          <div className="space-y-3">
            {booking.items?.filter((i) => i.group).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border-2 border-gray-300 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.group?.name || "Unbekannte Gruppe"}</div>
                  <div className="text-sm text-gray-600">
                    Charge: {item.batch?.code || "-"} | Anzahl: {item.anzahl} Stueck
                  </div>
                </div>
                <div className="w-8 h-8 border-2 border-gray-400 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Bases */}
        {booking.items?.some((i) => i.base) && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Basen:</h3>
            <div className="space-y-3">
              {booking.items?.filter((i) => i.base).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border-2 border-gray-300 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.base?.bezeichnung}</div>
                    <div className="text-sm text-gray-600">
                      Hersteller: {item.base?.hersteller} | Anzahl: {item.anzahl_basen || 0} Stueck
                    </div>
                  </div>
                  <div className="w-8 h-8 border-2 border-gray-400 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Checkliste:</h3>
          <div className="space-y-2">
            {[
              "DMX Basis PRO",
              "Handfernbedienung",
              "Versandlabel erstellt",
              "Rückgabe Label erstellt",
              "Rückgabelabel und Protokoll mit verpackt",
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border border-gray-300 rounded">
                <div className="w-6 h-6 border-2 border-gray-400 rounded flex-shrink-0"></div>
                <span className="text-gray-800">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping and Return Dates */}
        <div className="mb-8 grid grid-cols-2 gap-6">
          <div className="p-4 border-2 border-gray-300 rounded-lg">
            <div className="text-sm font-semibold text-gray-600 mb-2">Versand am:</div>
            <div className="h-8 border-b-2 border-gray-300"></div>
          </div>
          <div className="p-4 border-2 border-gray-300 rounded-lg">
            <div className="text-sm font-semibold text-gray-600 mb-2">Rückgabe am:</div>
            <div className="h-8 border-b-2 border-gray-300"></div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Buchungsdetails:</h3>
          <div className="mb-6 p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Buchungs-ID:</span>
                <span className="ml-2 text-gray-900">#{booking.id}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Ausgabe:</span>
                <span className="ml-2 text-gray-900">{ausgabeDatum}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Geplante Rückgabe:</span>
                <span className="ml-2 text-gray-900">{rueckgabeDatum}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Anzahl gesamt:</span>
                <span className="ml-2 text-gray-900">
                  {booking.items?.reduce((sum, item) => sum + item.anzahl, 0) || 0} Stück
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Returned Bands */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Folgende Bänder zurückgegeben:</h3>
          <div className="space-y-3">
            {booking.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border-2 border-gray-300 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.group?.name || "Unbekannte Gruppe"}</div>
                  <div className="text-sm text-gray-600">Anzahl: _____ Stück</div>
                </div>
                <div className="w-8 h-8 border-2 border-gray-400 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 border-2 border-gray-300 rounded-lg">
            <div className="text-sm font-semibold text-gray-600 mb-2">Gepackt von:</div>
            <div className="h-16 border-b-2 border-gray-300 mb-2"></div>
            <div className="text-xs text-gray-500">Unterschrift</div>
          </div>
          <div className="p-4 border-2 border-gray-300 rounded-lg">
            <div className="text-sm font-semibold text-gray-600 mb-2">Rückgepackt von:</div>
            <div className="h-16 border-b-2 border-gray-300 mb-2"></div>
            <div className="text-xs text-gray-500">Unterschrift</div>
          </div>
        </div>

        {/* Print Button (hidden when printing) */}
        <div className="mt-8 flex justify-center gap-4 no-print">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-gradient-to-r from-wristlink-cyan to-wristlink-purple text-white font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            Drucken
          </button>
          <button
            onClick={() => window.close()}
            className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all"
          >
            Schließen
          </button>
        </div>
      </div>
    </>
  )
}
