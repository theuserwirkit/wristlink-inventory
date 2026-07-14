import { redirect } from "next/navigation"

export default async function AnfragenRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  if (params.status) qs.set("status", params.status)
  if (params.source) qs.set("source", params.source)
  const query = qs.toString()
  redirect(query ? `/warenverwaltung/auftraege?${query}` : "/warenverwaltung/auftraege")
}
