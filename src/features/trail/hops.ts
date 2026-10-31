/** Hops between topics in a trail of `stepCount` steps, e.g. "1 HOP", "3 HOPS". */
export const hopLabel = (stepCount: number) => {
  const n = Math.max(stepCount - 1, 0)
  return `${n} ${n === 1 ? 'HOP' : 'HOPS'}`
}
