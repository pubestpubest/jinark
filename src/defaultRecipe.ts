import type { RecipeNode } from './types'

export const defaultRecipe: RecipeNode = {
  name: 'จินอาร์ค',
  emoji: '✨',
  image: 'jinark.png',
  need: 1,
  children: [
    // index 0 — ผม
    {
      name: 'ผมจินอาร์ค', need: 1, type: 'counter', image: 'hair-jinark.png',
      children: [
        { name: 'คริสตัลจินอาร์ค', need: 10, type: 'counter', image: 'crystal-jinark.png', note: 'พบได้ในกล่องจินอาร์ค 1~3 ชิ้น' }
      ]
    },
    // index 1 — ปีก
    {
      name: 'ปีกจินอาร์ค', need: 1, type: 'counter', image: 'wing-jinark.png',
      children: [
        { name: 'คริสตัลจินอาร์ค', need: 10, type: 'counter', image: 'crystal-jinark.png', note: 'พบได้ในกล่องจินอาร์ค 1~3 ชิ้น' }
      ]
    },
    // index 2 — ผ้าปิดตา
    {
      name: 'ผ้าปิดตาจินอาร์ค', need: 1, type: 'counter', image: 'blindfold-jinark.png',
      children: [
        { name: 'คริสตัลจินอาร์ค', need: 10, type: 'counter', image: 'crystal-jinark.png', note: 'พบได้ในกล่องจินอาร์ค 1~3 ชิ้น' }
      ]
    },
    // index 3 — ทักษะ
    {
      name: 'ทักษะแปรธาตุจินอาร์ค', need: 1, type: 'counter', image: 'skill-jinark.png',
      children: [
        {
          name: 'คริสตัลจินอาร์ค(เดวิล)', need: 1, type: 'counter', image: 'crystal-jinark-devil.png',
          children: [
            { name: 'ถุงมือพรีมาเดวิล',  need: 1, type: 'checkbox', image: 'glove-prima-devil.png' },
            { name: 'รองเท้าพรีมาเดวิล', need: 1, type: 'checkbox', image: 'shoes-prima-devil.png' },
            { name: 'ชุดพรีมาเดวิล',     need: 1, type: 'checkbox', image: 'suit-prima-devil.png'  },
            { name: 'ผมพรีมาเดวิล',      need: 1, type: 'checkbox', image: 'hair-prima-devil.png'  },
            { name: 'มงกุฏพรีมาเดวิล',   need: 1, type: 'checkbox', image: 'crown-prima-devil.png' },
            { name: 'ปีกพรีมาเดวิล',     need: 1, type: 'checkbox', image: 'wing-prima-devil.png'  }
          ]
        },
        {
          name: 'คริสตัลจินอาร์ค(แองเจิล)', need: 1, type: 'counter', image: 'crystal-jinark-angel.png',
          children: [
            { name: 'ถุงมือพรีมาแองเจิล',  need: 1, type: 'checkbox', image: 'glove-prima-angel.png' },
            { name: 'รองเท้าพรีมาแองเจิล', need: 1, type: 'checkbox', image: 'shoes-prima-angel.png' },
            { name: 'ชุดพรีมาแองเจิล',     need: 1, type: 'checkbox', image: 'suit-prima-angel.png'  },
            { name: 'ผมพรีมาแองเจิล',      need: 1, type: 'checkbox', image: 'hair-prima-angel.png'  },
            { name: 'มงกุฏพรีมาแองเจิล',   need: 1, type: 'checkbox', image: 'crown-prima-angel.png' },
            { name: 'ปีกพรีมาแองเจิล',     need: 1, type: 'checkbox', image: 'wing-prima-angel.png'  }
          ]
        }
      ]
    }
  ]
}
