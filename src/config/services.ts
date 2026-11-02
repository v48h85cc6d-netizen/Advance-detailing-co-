/**
 * SERVICES CONFIGURATION — names & descriptions live in the translation files
 * under `services.items.<id>`. Reorder or add entries here.
 */
export type ServiceCategory = 'cleaning' | 'correction' | 'protection' | 'performance' | 'styling';

export const services: { id: string; category: ServiceCategory }[] = [
  { id: 'general-cleaning', category: 'cleaning' },
  { id: 'ppf', category: 'protection' },
  { id: 'ecu-remap', category: 'performance' },
  { id: 'body-kits', category: 'styling' },
  { id: 'ceramic-coating', category: 'protection' },
  { id: 'paint-polishing', category: 'correction' },
  { id: 'plastic-restoration', category: 'correction' },
  { id: 'wheel-cleaning', category: 'cleaning' },
  { id: 'glass-polishing', category: 'correction' },
  { id: 'wheel-protection', category: 'protection' },
  { id: 'plastic-cleaning', category: 'cleaning' },
  { id: 'exhaust-polishing', category: 'correction' },
  { id: 'glass-protection', category: 'protection' },
  { id: 'engine-cleaning', category: 'cleaning' },
  { id: 'interior-film', category: 'styling' },
  { id: 'disinfection', category: 'cleaning' },
];
