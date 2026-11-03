import type { AssetFolder } from './images';
import routes from './routes.json';

/**
 * PROJECT CONFIGURATION
 * Text (titles, vehicle names, services, descriptions) lives in the translation
 * files under `projects.<slug>`. Each project has its OWN image folder.
 */
export type ProjectSlug = (typeof routes.projects)[number];

export interface Project {
  slug: ProjectSlug;
  folder: AssetFolder;
  /** number of photo slots on the project page */
  photoSlots: number;
  featured?: boolean;
  badge?: string;
}

export const projects: Project[] = [
  { slug: 'audi-rs3', folder: 'audi-rs3', photoSlots: 9, featured: true },
  { slug: 'ferrari-488-pista', folder: 'ferrari-488-pista', photoSlots: 14, featured: true },
  { slug: 'bmw-740d', folder: 'bmw-740d', photoSlots: 8, featured: true },
  { slug: 'audi-rs6', folder: 'audi-rs6', photoSlots: 7 },
  { slug: 'mercedes-s580-maybach', folder: 'mercedes-s580-maybach', photoSlots: 8 },
];

export const featuredProjects = projects.filter((p) => p.featured);
export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
