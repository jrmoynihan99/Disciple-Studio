/**
 * A shared no-op. Passed to framer-motion's `onUpdate` on reveal elements: it
 * forces motion to commit values via React on every frame, which avoids a
 * first-paint flash where the element renders in its `animate` (visible) state
 * for one frame before the `initial` (hidden) state is applied.
 */
export const noop = () => {};
