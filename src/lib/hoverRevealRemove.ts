/** Parent element needs the `group` class. Hidden until card hover; visible when the remove control is keyboard-focused. */
export const hoverRevealRemoveClassName =
  "pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100";

/** Parent needs `group`. Shown on row hover (e.g. drag handle). */
export const hoverRevealOnGroupClassName =
  "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100";

/** Visually centers the × glyph inside a square remove control. */
export const removeIconMarkClassName = "block translate-y-[-0.5px] text-lg leading-none";
