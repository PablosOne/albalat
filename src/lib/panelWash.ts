/**
 * Accent-aware helpers for per-panel background wash and decorative borders.
 *
 * Why a helper: PanelCard / PanelStat / PanelBrand all paint a soft radial-gradient
 * wash behind their content using the panel's `accent` color. Naive string
 * concatenation (`${accent}1f`) breaks when `accent` is a CSS `var(--token)`
 * reference, since `var(--color-accent)1f` is not valid CSS and browsers drop
 * the declaration. This helper branches on hex vs. non-hex and uses `color-mix`
 * for the non-hex path.
 */

const HEX_PATTERN = /^#[0-9a-fA-F]{3,8}$/;

/** Resolve a raw accent value: explicit hex/CSS color from the panel, or the CSS variable fallback. */
export function resolveAccent(accent: string | undefined): string {
  return accent ?? 'var(--color-accent)';
}

/** Low-alpha fill (e.g. for a wash background). `percent` is the percentage for the `color-mix` path. */
export function accentFill(accent: string, percent: number, hexAlpha: string): string {
  if (HEX_PATTERN.test(accent)) return `${accent}${hexAlpha}`;
  return `color-mix(in srgb, ${accent} ${percent}%, transparent)`;
}

export interface WashOptions {
  /** Accent, already resolved (hex or CSS `var(...)` reference). */
  accent: string;
  /** Percentage used in the `color-mix` branch. Default 12. */
  percent?: number;
  /** Hex alpha suffix (two chars) used in the hex branch. Default `1f` (~12%). */
  hexAlpha?: string;
  /** Radial-gradient ellipse size, e.g. `"80% 60%"`. Default `"80% 60%"`. */
  size?: string;
  /** Radial-gradient position, e.g. `"70% 40%"`. Default `"70% 40%"`. */
  position?: string;
}

/**
 * Build the inline `style` string for the `[data-panel-wash]` layer.
 *
 * The returned string starts with `background: ...` and ends with a semicolon,
 * so it can be dropped straight into `style={...}`.
 */
export function buildWashStyle(opts: WashOptions): string {
  const { accent, percent = 12, hexAlpha = '1f', size = '80% 60%', position = '70% 40%' } = opts;
  const fill = accentFill(accent, percent, hexAlpha);
  return `background: radial-gradient(ellipse ${size} at ${position}, ${fill}, transparent 70%);`;
}
