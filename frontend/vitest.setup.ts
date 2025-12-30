import "@testing-library/jest-dom/vitest";

if (!globalThis.ResizeObserver) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  (globalThis as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver =
    ResizeObserver;
}
