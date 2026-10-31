export type Strength = 'strong' | 'related' | 'surprising'

/** id is the canonical Wikipedia page title (spaces, not underscores). */
export type Topic = {
  id: string
  title: string
  summary: string
  thumbnail?: string
  url: string
  disambiguation: boolean
}

export type Neighbor = { id: string; strength: Strength }
