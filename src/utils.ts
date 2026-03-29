import type { RecipeNode, ProgressMap, AltMap } from './types'

export interface LeafInfo {
  node: RecipeNode
  key: string
  needScaled: number
}

export function collectLeaves(
  nodes: RecipeNode[],
  prefix: string,
  qty: number,
  altMap: AltMap,
): LeafInfo[] {
  const leaves: LeafInfo[] = []
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const key = `${prefix}_${i}`
    const activeChildren = getActiveChildren(node, key, altMap)
    if (activeChildren.length > 0) {
      leaves.push(...collectLeaves(activeChildren, key, qty, altMap))
    } else {
      leaves.push({
        node,
        key,
        needScaled: node.type === 'checkbox' ? 1 : node.need * qty,
      })
    }
  }
  return leaves
}

export function getActiveChildren(node: RecipeNode, key: string, altMap: AltMap): RecipeNode[] {
  if (node.children) return node.children
  if (node.alternatives) {
    const idx = altMap[key] ?? 0
    return node.alternatives[idx]?.children ?? []
  }
  return []
}

interface LeafTotals {
  have: number
  need: number
}

// Returns the total leaf-unit count for a subtree (used for "directly obtained" override)
function subtreeNeed(node: RecipeNode, key: string, qty: number, altMap: AltMap): number {
  const activeChildren = getActiveChildren(node, key, altMap)
  if (activeChildren.length === 0) {
    return node.type === 'checkbox' ? 1 : node.need * qty
  }
  return activeChildren.reduce((sum, child, i) =>
    sum + subtreeNeed(child, `${key}_${i}`, qty, altMap), 0)
}

export function collectLeafTotals(
  nodes: RecipeNode[],
  prefix: string,
  qty: number,
  progress: ProgressMap,
  altMap: AltMap,
): LeafTotals {
  let have = 0
  let need = 0

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const key = `${prefix}_${i}`
    const activeChildren = getActiveChildren(node, key, altMap)

    // "Directly obtained" override: parent node marked as owned via inventory
    if (progress[key] === true && activeChildren.length > 0) {
      const full = subtreeNeed(node, key, qty, altMap)
      have += full
      need += full
      continue
    }

    if (activeChildren.length > 0) {
      const sub = collectLeafTotals(activeChildren, key, qty, progress, altMap)
      have += sub.have
      need += sub.need
    } else {
      if (node.type === 'checkbox') {
        have += progress[key] === true ? 1 : 0
        need += 1
      } else {
        const needScaled = node.need * qty
        const rawHave = (progress[key] as number) ?? 0
        have += Math.min(rawHave, needScaled)
        need += needScaled
      }
    }
  }

  return { have, need }
}

export function calcNodeProgress(
  node: RecipeNode,
  key: string,
  qty: number,
  progress: ProgressMap,
  altMap: AltMap,
): number {
  const activeChildren = getActiveChildren(node, key, altMap)

  // "Directly obtained" override
  if (progress[key] === true && activeChildren.length > 0) return 1

  if (activeChildren.length === 0) {
    if (node.type === 'checkbox') {
      return progress[key] === true ? 1 : 0
    }
    const needScaled = node.need * qty
    const rawHave = (progress[key] as number) ?? 0
    return needScaled > 0 ? Math.min(rawHave / needScaled, 1) : 0
  }
  const totals = collectLeafTotals(activeChildren, key, qty, progress, altMap)
  return totals.need > 0 ? totals.have / totals.need : 0
}
