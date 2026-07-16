import type { QuoteVersionRow } from "@/lib/konfigurator/quote-versions"

const DOT_COLORS: Record<QuoteVersionRow["availability_level"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
}

const ACTOR_LABELS: Record<QuoteVersionRow["changed_by"], string> = {
  customer: "Kunde",
  admin: "Admin",
  system: "System",
}

function formatVersionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function QuoteVersionTimeline({
  versions,
  showActor = false,
  publicToken,
}: {
  versions: QuoteVersionRow[]
  showActor?: boolean
  publicToken?: string
}) {
  if (versions.length === 0) return null

  const highestVersionNumber = Math.max(...versions.map((v) => v.version_number))

  return (
    <ol className="space-y-4">
      {versions.map((version) => {
        const isCurrent = version.version_number === highestVersionNumber

        return (
          <li key={version.id} className="flex gap-3">
            <div className="mt-1.5 shrink-0">
              <span
                className={`block h-2.5 w-2.5 rounded-full ${DOT_COLORS[version.availability_level]}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Version {version.version_number}
                {isCurrent && (
                  <span className="ml-2 text-xs font-normal text-primary">aktuell</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatVersionDate(version.created_at)}
                {showActor && ` · ${ACTOR_LABELS[version.changed_by]}`}
              </p>
              {version.change_summary && (
                <p className="text-sm mt-0.5">{version.change_summary}</p>
              )}
              {publicToken && Boolean(version.has_offer_pdf) && (
                <p className="text-sm mt-1">
                  <a
                    href={`/api/angebot/${publicToken}/versions/${version.version_number}/offer-pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    PDF
                  </a>
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
