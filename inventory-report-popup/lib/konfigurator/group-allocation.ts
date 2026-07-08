import type { AvailabilityStressLevel } from "@/lib/konfigurator/availability-stress"
import { getAvailabilityForGroupBatchesByDateRange } from "@/lib/actions/bookings"
import { resolveGroupsForProduct } from "@/lib/product-mapping"
import {
  MAX_PHYSICAL_GROUPS,
  normalizeKanalanzahl,
  type Kanalanzahl,
} from "@/lib/konfigurator/kanalanzahl"

export type InventoryGroupPool = {
  groupId: number
  name: string
  kanalanzahl: number
  frei: number
}

export type GroupSlotAssignment = {
  slot: number
  benoetigt: number
  zuteilungen: Array<{ groupId: number; name: string; anzahl: number }>
}

export type GroupProgrammingAvailability = {
  verfuegbar: boolean
  slots: GroupSlotAssignment[]
  fehlendeSlots: number[]
  hinweis?: string
  inventory: InventoryGroupPool[]
  physischeGruppen: number
  maxPhysischeGruppen: number
}

function parseDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`)
}

export async function getInventoryGroupPools(
  von: string,
  bis: string,
  kanalanzahl?: number,
): Promise<InventoryGroupPool[]> {
  const ch = kanalanzahl != null ? normalizeKanalanzahl(kanalanzahl) : undefined
  const groups = await resolveGroupsForProduct("armband", ch)
  const ausgabe = parseDate(von)
  const rueckgabe = parseDate(bis)
  const stats = await getAvailabilityForGroupBatchesByDateRange(
    groups.map((group) => group.id),
    ausgabe,
    rueckgabe,
  )
  const freiByGroup = new Map<number, number>()
  for (const row of stats) {
    freiByGroup.set(row.groupId, (freiByGroup.get(row.groupId) || 0) + row.verfuegbar)
  }
  const pools: InventoryGroupPool[] = []

  for (const group of groups) {
    const frei = freiByGroup.get(group.id) || 0
    if (frei <= 0) continue
    pools.push({
      groupId: group.id,
      name: group.name,
      kanalanzahl: group.kanalanzahl,
      frei,
    })
  }

  return pools.sort((a, b) => b.frei - a.frei)
}

function allocateFromPools(
  gruppenGroessen: number[],
  inventory: InventoryGroupPool[],
): { slots: GroupSlotAssignment[]; fehlendeSlots: number[] } {
  const remaining = inventory.map((g) => ({ ...g }))
  const slots: GroupSlotAssignment[] = []
  const fehlendeSlots: number[] = []

  gruppenGroessen.forEach((benoetigt, index) => {
    if (benoetigt <= 0) {
      slots.push({ slot: index + 1, benoetigt: 0, zuteilungen: [] })
      return
    }

    let left = benoetigt
    const zuteilungen: GroupSlotAssignment["zuteilungen"] = []
    const sorted = [...remaining].sort((a, b) => b.frei - a.frei)

    for (const pool of sorted) {
      if (left <= 0) break
      if (pool.frei <= 0) continue
      const take = Math.min(left, pool.frei)
      pool.frei -= take
      left -= take
      const inv = inventory.find((g) => g.groupId === pool.groupId)!
      zuteilungen.push({ groupId: pool.groupId, name: inv.name, anzahl: take })
    }

    slots.push({ slot: index + 1, benoetigt, zuteilungen })
    if (left > 0) fehlendeSlots.push(index + 1)
  })

  return { slots, fehlendeSlots }
}

function countDistinctGroups(slots: GroupSlotAssignment[]): number {
  const ids = new Set<number>()
  for (const slot of slots) {
    for (const z of slot.zuteilungen) ids.add(z.groupId)
  }
  return ids.size
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [[]]
  if (items.length < size) return []
  if (size === 1) return items.map((item) => [item])
  const [first, ...rest] = items
  return [
    ...combinations(rest, size - 1).map((combo) => [first, ...combo]),
    ...combinations(rest, size),
  ]
}

function buildGroupCombos(
  inventory: InventoryGroupPool[],
  maxPhysical: number,
): InventoryGroupPool[][] {
  const combos: InventoryGroupPool[][] = []
  const limit = Math.min(maxPhysical, inventory.length)
  for (let size = 1; size <= limit; size++) {
    combos.push(...combinations(inventory, size))
  }
  return combos.sort(
    (a, b) =>
      b.reduce((sum, g) => sum + g.frei, 0) - a.reduce((sum, g) => sum + g.frei, 0),
  )
}

/**
 * Ordnet pro Kunden-Gruppe (Slot) Bänder aus passenden Lagergruppen zu.
 * Max. {@link MAX_PHYSICAL_GROUPS} verschiedene physische G-Gruppen insgesamt.
 */
export function allocateGroupProgramming(
  gruppenGroessen: number[],
  inventory: InventoryGroupPool[],
  maxPhysicalGroups: number = MAX_PHYSICAL_GROUPS,
): GroupProgrammingAvailability {
  const empty: GroupProgrammingAvailability = {
    verfuegbar: false,
    slots: [],
    fehlendeSlots: gruppenGroessen.map((_, i) => i + 1),
    inventory,
    physischeGruppen: 0,
    maxPhysischeGruppen: maxPhysicalGroups,
  }

  if (inventory.length === 0) {
    return { ...empty, hinweis: "Keine passenden Leuchtgruppen im Bestand." }
  }

  const combos = buildGroupCombos(inventory, maxPhysicalGroups)
  let bestPartial: GroupProgrammingAvailability | null = null

  for (const combo of combos) {
    const { slots, fehlendeSlots } = allocateFromPools(gruppenGroessen, combo)
    const physischeGruppen = countDistinctGroups(slots)

    if (fehlendeSlots.length === 0) {
      return {
        verfuegbar: true,
        slots,
        fehlendeSlots: [],
        inventory,
        physischeGruppen,
        maxPhysischeGruppen: maxPhysicalGroups,
      }
    }

    if (!bestPartial || fehlendeSlots.length < bestPartial.fehlendeSlots.length) {
      bestPartial = {
        verfuegbar: false,
        slots,
        fehlendeSlots,
        inventory,
        physischeGruppen,
        maxPhysischeGruppen: maxPhysicalGroups,
      }
    }
  }

  return {
    ...(bestPartial ?? empty),
    hinweis:
      bestPartial && bestPartial.fehlendeSlots.length > 0
        ? `Für Gruppe(n) ${bestPartial.fehlendeSlots.join(", ")} reicht der Bestand nicht aus (max. ${maxPhysicalGroups} physische Lagergruppen).`
        : `Mit höchstens ${maxPhysicalGroups} physischen Lagergruppen ist keine vollständige Zuordnung möglich.`,
  }
}

export async function checkGroupProgrammingAvailability(input: {
  von: string
  bis?: string
  gruppenGroessen: number[]
  kanalanzahl?: number
}): Promise<GroupProgrammingAvailability> {
  const bis = input.bis || input.von
  const sizes = input.gruppenGroessen
  const kanalanzahl = normalizeKanalanzahl(input.kanalanzahl)

  if (sizes.length === 0 || sizes.every((n) => n <= 0)) {
    return {
      verfuegbar: true,
      slots: [],
      fehlendeSlots: [],
      inventory: [],
      physischeGruppen: 0,
      maxPhysischeGruppen: MAX_PHYSICAL_GROUPS,
    }
  }

  const inventory = await getInventoryGroupPools(input.von, bis, kanalanzahl)
  return allocateGroupProgramming(sizes, inventory)
}

export function computeStationStress(input: {
  verfuegbar: boolean
  frei: number | null
  bestand: number | null
  belegt: number | null
}): { stressLevel: AvailabilityStressLevel; stressScore: number; stressLabel: string } {
  if (!input.verfuegbar) {
    return { stressLevel: "red", stressScore: 82, stressLabel: "Controller nicht verfügbar" }
  }
  const free = input.frei ?? 1
  const stock = input.bestand ?? free
  const occupancy = stock > 0 && input.belegt != null ? input.belegt / stock : 0
  if (free <= 1 || occupancy >= 0.75) {
    return { stressLevel: "yellow", stressScore: 52, stressLabel: "Controller knapp" }
  }
  return { stressLevel: "green", stressScore: 18, stressLabel: "Controller verfügbar" }
}
