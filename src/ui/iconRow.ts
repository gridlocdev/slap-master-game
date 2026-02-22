/**
 * Helper utilities for building rows of input-prompt icons using BabylonJS GUI.
 */

import { Image, StackPanel, TextBlock, Control, type Container } from '@babylonjs/gui';

let _uid = 0;
function uid(): number { return _uid++; }

/** Size presets for icon images. */
export const ICON_SIZE = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
} as const;

export type IconSizeKey = keyof typeof ICON_SIZE;

/**
 * Create a single BabylonJS GUI `Image` control from a Vite-resolved URL.
 */
export function createIcon(url: string, size: number, name?: string): Image {
  const img = new Image(name ?? `icon_${uid()}`, url);
  img.width = `${size}px`;
  img.height = `${size}px`;
  img.stretch = Image.STRETCH_UNIFORM;
  return img;
}

/**
 * Build a horizontal StackPanel containing a sequence of icon images
 * with an optional text label between groups.
 *
 * `items` is an array of:
 *   - `{ icon: url }` — adds an icon image
 *   - `{ text: string }` — adds a text separator/label
 *   - `{ text: string, icon: url }` — adds text then icon
 */
export interface IconRowItem {
  icon?: string;
  text?: string;
}

export function createIconRow(
  items: IconRowItem[],
  opts: {
    iconSize?: number;
    fontSize?: number;
    color?: string;
    gap?: number;
    name?: string;
    height?: string;
  } = {},
): StackPanel {
  const size = opts.iconSize ?? ICON_SIZE.sm;
  const fontSize = opts.fontSize ?? 14;
  const color = opts.color ?? '#ffffff';
  const gap = opts.gap ?? 2;
  const name = opts.name ?? `iconRow_${uid()}`;

  const row = new StackPanel(name);
  row.isVertical = false;
  row.height = opts.height ?? `${size + 4}px`;
  row.adaptWidthToChildren = true;
  row.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

  for (const item of items) {
    if (item.text != null) {
      const tb = new TextBlock(`${name}_txt_${uid()}`, item.text);
      tb.fontSize = fontSize;
      tb.fontFamily = 'monospace';
      tb.color = color;
      tb.resizeToFit = true;
      tb.paddingLeft = `${gap}px`;
      tb.paddingRight = `${gap}px`;
      tb.height = `${size}px`;
      row.addControl(tb);
    }
    if (item.icon != null) {
      const img = createIcon(item.icon, size);
      img.paddingLeft = `${gap / 2}px`;
      img.paddingRight = `${gap / 2}px`;
      row.addControl(img);
    }
  }

  return row;
}

/**
 * Build an icon row from an array of icon keys and a lookup map.
 * Icons are placed side-by-side. A separator string can be placed between groups
 * by calling this multiple times and combining with text items.
 */
export function iconsFromKeys(
  keys: readonly string[],
  iconMap: Record<string, string>,
): IconRowItem[] {
  return keys.map(k => ({ icon: iconMap[k] }));
}

/**
 * Convenience: add an icon row to a parent container, positioned as desired.
 */
export function addIconRowTo(
  parent: Container,
  items: IconRowItem[],
  opts: {
    iconSize?: number;
    fontSize?: number;
    color?: string;
    gap?: number;
    name?: string;
    height?: string;
    hAlign?: number;
    vAlign?: number;
    left?: string;
    top?: string;
  } = {},
): StackPanel {
  const row = createIconRow(items, opts);
  if (opts.hAlign != null) row.horizontalAlignment = opts.hAlign;
  if (opts.vAlign != null) row.verticalAlignment = opts.vAlign;
  if (opts.left) row.left = opts.left;
  if (opts.top) row.top = opts.top;
  parent.addControl(row);
  return row;
}
