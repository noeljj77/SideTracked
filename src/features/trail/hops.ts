/** Hops between topics in a trail of `stepCount` steps, e.g. "1 hop", "3 hops". */
export const hopLabel = (stepCount: number) => {
  const n = Math.max(stepCount - 1, 0)
  return `${n} ${n === 1 ? 'hop' : 'hops'}`
}
