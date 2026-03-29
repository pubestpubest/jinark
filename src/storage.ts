import type { RecipeNode, ProgressMap, AltMap } from './types'
import { defaultRecipe } from './defaultRecipe'

const KEYS = {
  recipe: 'tr_recipe',
  progress: 'tr_progress',
  qty: 'tr_qty',
  alt: 'tr_alt',
} as const

export function loadRecipe(): RecipeNode {
  try {
    const raw = localStorage.getItem(KEYS.recipe)
    return raw ? (JSON.parse(raw) as RecipeNode) : defaultRecipe
  } catch {
    return defaultRecipe
  }
}

export function saveRecipe(recipe: RecipeNode) {
  localStorage.setItem(KEYS.recipe, JSON.stringify(recipe))
}

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEYS.progress)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

export function saveProgress(progress: ProgressMap) {
  localStorage.setItem(KEYS.progress, JSON.stringify(progress))
}

export function loadQty(): number {
  const raw = localStorage.getItem(KEYS.qty)
  const n = raw ? parseInt(raw, 10) : 1
  return isNaN(n) || n < 1 ? 1 : n
}

export function saveQty(qty: number) {
  localStorage.setItem(KEYS.qty, String(qty))
}

export function loadAlt(): AltMap {
  try {
    const raw = localStorage.getItem(KEYS.alt)
    return raw ? (JSON.parse(raw) as AltMap) : {}
  } catch {
    return {}
  }
}

export function saveAlt(alt: AltMap) {
  localStorage.setItem(KEYS.alt, JSON.stringify(alt))
}

export function resetProgress() {
  localStorage.removeItem(KEYS.progress)
}

export function clearAll() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
