export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const control = `inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium ${focusRing}`;

export const primaryButton = `${control} bg-primary text-white hover:bg-primary/90 disabled:opacity-60 aria-disabled:opacity-60`;
export const secondaryButton = `${control} border border-line bg-surface text-ink hover:bg-paper disabled:opacity-60 aria-disabled:opacity-60`;
export const dangerButton = `${control} bg-danger text-white hover:bg-danger/90 disabled:opacity-60`;

// The focused entry keeps the 2 px outline of the spec (§ 2): its background alone is 1.13:1.
export const menuItem = `flex h-10 w-full items-center px-3 text-left text-sm hover:bg-paper focus:bg-paper ${focusRing}`;
