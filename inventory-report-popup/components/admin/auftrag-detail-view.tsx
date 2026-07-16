"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuoteOrderWorkflow } from "@/components/admin/quote-order-workflow"
import { QuoteWarehousePanel, type QuoteWarehousePanelProps } from "@/components/admin/quote-warehouse-panel"
import type { WarehousePipelineContext } from "@/lib/konfigurator/order-pipeline"
import type { PackingSheetData } from "@/lib/konfigurator/packing-sheet"
import type { QuoteFulfillmentEvent, QuoteRequest } from "@/lib/konfigurator/types"
import type { ReactNode } from "react"

type AuftragDetailViewProps = {
  /** Ohne `public_token` – der Token wird ausschließlich im Info-Tab serverseitig gerendert. */
  quote: Omit<QuoteRequest, "public_token">
  leadEmail: string
  events: QuoteFulfillmentEvent[]
  stripeConfigured: boolean
  sevdeskConfigured: boolean
  warehouseContext: WarehousePipelineContext
  warehousePanelProps: QuoteWarehousePanelProps
  packingSheetData: PackingSheetData | null
  infoTab: ReactNode
}

export function AuftragDetailView({
  quote,
  leadEmail,
  events,
  stripeConfigured,
  sevdeskConfigured,
  warehouseContext,
  warehousePanelProps,
  packingSheetData,
  infoTab,
}: AuftragDetailViewProps) {
  return (
    <Tabs defaultValue="abwicklung" className="gap-4">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="abwicklung">Abwicklung</TabsTrigger>
        <TabsTrigger value="lager">Lager</TabsTrigger>
        <TabsTrigger value="info">Info</TabsTrigger>
      </TabsList>

      <TabsContent value="abwicklung" className="mt-0">
        <QuoteOrderWorkflow
          quote={quote}
          leadEmail={leadEmail}
          events={events}
          stripeConfigured={stripeConfigured}
          sevdeskConfigured={sevdeskConfigured}
          warehouseContext={warehouseContext}
          warehousePanelProps={warehousePanelProps}
          packingSheetData={packingSheetData}
        />
      </TabsContent>

      <TabsContent value="lager" className="mt-0">
        <QuoteWarehousePanel {...warehousePanelProps} variant="reference" />
      </TabsContent>

      <TabsContent value="info" className="mt-0">
        {infoTab}
      </TabsContent>
    </Tabs>
  )
}
