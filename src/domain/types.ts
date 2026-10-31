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

/** Why a topic is offered: similar text, linked both ways, or both (the best sign). A tangent is only linked. */
export type Why = 'both' | 'similar' | 'tangent'

export type Neighbor = { id: string; strength: Strength; why: Why }
