export interface AltRecipe {
  label: string
  children: RecipeNode[]
}

export interface RecipeNode {
  name: string
  emoji?: string
  image?: string
  need: number
  type?: 'checkbox' | 'counter'
  note?: string
  children?: RecipeNode[]
  alternatives?: AltRecipe[]
}

export type ProgressMap = Record<string, number | boolean>
export type AltMap = Record<string, number>
