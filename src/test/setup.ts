import '@testing-library/jest-dom/vitest'

// jsdom has no matchMedia; tests run at "wide" size.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
})) as unknown as typeof window.matchMedia

// jsdom has no pointer capture, which dragging a graph node uses.
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
