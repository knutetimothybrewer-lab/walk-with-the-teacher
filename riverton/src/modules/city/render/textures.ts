import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Texture } from 'pixi.js';
import { Building, type BuildingKind } from '../../../platform/art/Buildings';

/** City art is drawn as SVG in code; here it is rasterized once into Pixi textures. */
export async function buildTextures(kinds: BuildingKind[], px = 160): Promise<Record<string, Texture>> {
  const out: Record<string, Texture> = {};
  await Promise.all(kinds.map(async (k) => {
    const svg = renderToStaticMarkup(createElement(Building, { kind: k, size: px })).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const img = new Image(); img.width = px; img.height = Math.round(px * 0.92);
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('texture ' + k)); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    out[k] = Texture.from(img);
  }));
  return out;
}
