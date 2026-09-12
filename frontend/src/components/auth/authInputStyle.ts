import type { CSSProperties } from 'react';

export const authInputClassName =
  'auth-input w-full px-3 py-2.5 bg-ig-muted border border-ig-border/80 rounded-xl text-sm placeholder:text-ig-text-secondary';

/** Inline styles beat cached CSS and prevent serif webfont matching in inputs. */
export const authInputStyle: CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", "Segoe UI", Tahoma, sans-serif',
  letterSpacing: 'normal',
  textAlign: 'left',
  fontSize: 14,
  fontKerning: 'normal',
  fontFeatureSettings: 'normal',
  WebkitAppearance: 'none',
  appearance: 'none',
};
