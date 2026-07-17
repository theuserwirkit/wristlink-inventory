export type BandBatchPool = {
  groupId: number
  groupName: string
  batchId: number
  batchCode: string
  verfuegbar: number
  gesamtsumme: number
  inVermietung: number
}

export type BandAllocationLine = {
  groupId: number
  batchId: number
  anzahl: number
  groupName: string
  batchCode: string
}

/** Greedy-Vorschlag: größte freie Pools zuerst, bis menge erreicht. */
export function suggestBandAllocation(
  menge: number,
  pools: BandBatchPool[],
): BandAllocationLine[] {
  if (menge <= 0) return []

  const remaining = pools
    .filter((pool) => pool.verfuegbar > 0)
    .map((pool) => ({ ...pool }))
    .sort((a, b) => b.verfuegbar - a.verfuegbar)

  const result: BandAllocationLine[] = []
  let left = menge

  for (const pool of remaining) {
    if (left <= 0) break
    const take = Math.min(left, pool.verfuegbar)
    if (take <= 0) continue
    result.push({
      groupId: pool.groupId,
      batchId: pool.batchId,
      anzahl: take,
      groupName: pool.groupName,
      batchCode: pool.batchCode,
    })
    left -= take
  }

  return result
}
