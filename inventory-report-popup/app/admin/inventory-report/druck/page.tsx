import { notFound, redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { getInventoryChangesReport } from "@/lib/actions/admin"
import {
  InventoryReportPrintView,
  type InventoryReportRow,
} from "@/components/print/inventory-report-print-view"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ year?: string; month?: string; autoprint?: string }>
}

export default async function InventoryReportPrintPage({ searchParams }: PageProps) {
  if (!(await isAuthenticated())) redirect("/login")

  const { year: yearParam, month: monthParam, autoprint } = await searchParams
  const now = new Date()
  const year = Number(yearParam) || now.getFullYear()
  const month = Number(monthParam) || now.getMonth() + 1
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) notFound()

  const result = await getInventoryChangesReport(year, month)
  if (!result.success || !result.data) notFound()

  return (
    <div className="min-h-screen bg-white">
      <InventoryReportPrintView
        year={year}
        month={month}
        rows={result.data as unknown as InventoryReportRow[]}
        autoprint={autoprint === "1"}
      />
    </div>
  )
}
