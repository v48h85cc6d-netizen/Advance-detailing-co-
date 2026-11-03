import manifest, { sizes as sizeMap } from 'virtual:asset-manifest';

/**
 * IMAGE SLOTS
 * Every placeholder on the site reads from its own folder in /public/assets/.
 * Add photographs to the folder (jpg / png / webp / avif) and they fill the
 * slots in natural filename order: 01.jpg, 02.jpg, … 10.jpg.
 * A file named `cover.*` is used as the project's cover / card image.
 * Folders are never shared, so photographs can never mix between projects.
 */
export type AssetFolder =
  | 'homepage'
  | 'audi-rs3'
  | 'ferrari-488-pista'
  | 'bmw-740d'
  | 'audi-rs6'
  | 'mercedes-s580-maybach'
  | 'gallery'
  | 'certifications'
  | 'about';

const isCover = (src: string) => /\/cover\.[a-z0-9]+$/i.test(src);

export function folderImages(folder: AssetFolder): string[] {
  return manifest[folder] ?? [];
}

/** Images of a folder excluding `cover.*`, padded to `count` slots (undefined = empty placeholder). */
export function slots(folder: AssetFolder, count: number): (string | undefined)[] {
  const files = folderImages(folder).filter((s) => !isCover(s));
  return Array.from({ length: count }, (_, i) => files[i]);
}

/** Cover image: `cover.*` if present, otherwise the first photo of that folder. */
export function coverImage(folder: AssetFolder): string | undefined {
  const files = folderImages(folder);
  return files.find(isCover) ?? files[0];
}

/** srcset with the small responsive copies + the original (largest), or undefined if none exist. */
export function srcSetFor(src?: string, originalWidth = 1600): string | undefined {
  const list = src ? sizeMap[src] : undefined;
  if (!list?.length) return undefined;
  return [...list.map(([w, u]) => `${u} ${w}w`), `${src} ${originalWidth}w`].join(', ');
}

/** Find a specifically-named file, e.g. named('certifications', 'carpro'). */
export function named(folder: AssetFolder, baseName: string): string | undefined {
  return folderImages(folder).find((s) => new RegExp(`/${baseName}\\.[a-z0-9]+$`, 'i').test(s));
}

export const logo = {
  navWhite: '/assets/logo/logo-nav-white.svg',
  navBlack: '/assets/logo/logo-nav-black.svg',
  fullWhite: '/assets/logo/logo-full-white.svg',
  fullBlack: '/assets/logo/logo-full-black.svg',
  symbolWhite: '/assets/logo/logo-symbol-white.svg',
  symbolBlack: '/assets/logo/logo-symbol-black.svg',
};

export const introVideo = {
  webm: '/assets/intro-video/intro.webm',
  mp4: '/assets/intro-video/intro.mp4',
  ambient: '/assets/intro-video/intro-ambient.mp4',
  poster: '/assets/intro-video/intro-poster.jpg',
  posterSmall: '/assets/intro-video/intro-poster.webp',
};
