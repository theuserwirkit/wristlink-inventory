import { redirect } from "next/navigation"

export default async function AnfrageDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/warenverwaltung/auftraege/${id}`)
}
