"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ItemType } from "@/lib/types"

interface StatsFiltersProps {
  groups: Array<{ id: number; name: string }>
  features: Array<{ id: number; name: string }>
  onFilterChange: (filters: {
    itemType?: ItemType
    groupId?: number
    featureId?: number
  }) => void
}

export function StatsFilters({ groups, features, onFilterChange }: StatsFiltersProps) {
  const [itemType, setItemType] = useState<ItemType | "ALL">("ALL")
  const [groupId, setGroupId] = useState<number | "ALL">("ALL")
  const [featureId, setFeatureId] = useState<number | "ALL">("ALL")

  const handleFilterChange = (
    newItemType: ItemType | "ALL",
    newGroupId: number | "ALL",
    newFeatureId: number | "ALL",
  ) => {
    onFilterChange({
      itemType: newItemType === "ALL" ? undefined : newItemType,
      groupId: newGroupId === "ALL" ? undefined : newGroupId,
      featureId: newFeatureId === "ALL" ? undefined : newFeatureId,
    })
  }

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="itemType">Artikeltyp</Label>
        <Select
          value={itemType}
          onValueChange={(value) => {
            const newValue = value as ItemType | "ALL"
            setItemType(newValue)
            handleFilterChange(newValue, groupId, featureId)
          }}
        >
          <SelectTrigger id="itemType" className="w-[180px]">
            <SelectValue placeholder="Alle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle</SelectItem>
            <SelectItem value="LED_BAND">LED-Bänder</SelectItem>
            <SelectItem value="LED_LICHT">LED-Lichter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="group">Leuchtgruppe</Label>
        <Select
          value={groupId.toString()}
          onValueChange={(value) => {
            const newValue = value === "ALL" ? "ALL" : Number.parseInt(value)
            setGroupId(newValue)
            handleFilterChange(itemType, newValue, featureId)
          }}
        >
          <SelectTrigger id="group" className="w-[180px]">
            <SelectValue placeholder="Alle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id.toString()}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="feature">Funktionsumfang</Label>
        <Select
          value={featureId.toString()}
          onValueChange={(value) => {
            const newValue = value === "ALL" ? "ALL" : Number.parseInt(value)
            setFeatureId(newValue)
            handleFilterChange(itemType, groupId, newValue)
          }}
        >
          <SelectTrigger id="feature" className="w-[180px]">
            <SelectValue placeholder="Alle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle</SelectItem>
            {features.map((feature) => (
              <SelectItem key={feature.id} value={feature.id.toString()}>
                {feature.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
