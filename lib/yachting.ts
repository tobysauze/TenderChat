// Yachting-specific reference data that makes Tender a dating app built around
// how yacht crew actually live and meet — clustered in a handful of marinas and
// organised entirely around the season. Used across profile setup, the deck and
// filtering.

// Curated list of the marinas / ports where yacht crew actually congregate,
// grouped loosely by cruising ground. Stored on the profile as plain text.
export const MARINAS: string[] = [
  // Mediterranean — France
  'Antibes (Port Vauban)',
  'Monaco (Port Hercule)',
  'Cannes',
  'Nice',
  'Golfe-Juan',
  'Saint-Tropez',
  // Mediterranean — Spain
  'Palma de Mallorca',
  'Barcelona',
  'Ibiza',
  // Mediterranean — Italy
  'Genoa',
  'Viareggio',
  'Naples',
  'Olbia (Sardinia)',
  // Mediterranean — other
  'Athens',
  'Split',
  'Tivat (Montenegro)',
  'Gibraltar',
  // Caribbean
  'Antigua (English Harbour)',
  'Sint Maarten',
  'St Thomas (USVI)',
  'Nassau (Bahamas)',
  // Americas
  'Fort Lauderdale',
  'Miami',
  'Newport (RI)',
  // Rest of world
  'Dubai',
  'Phuket',
  'Auckland',
  'Other / At sea',
];

// The "season" is the central organising concept of crew life — it tells you
// roughly where someone is and where they're heading.
export const SEASONS: string[] = [
  'Mediterranean season',
  'Caribbean season',
  'Shipyard / Refit',
  'Crossing / Delivery',
  'Northern Europe',
  'Land-based / On leave',
];

// Availability tells a match what your schedule looks like — a concept a general
// dating app has no notion of (crew can be off-grid on charter for weeks).
export const AVAILABILITY: string[] = [
  'Available',
  'On charter',
  'On rotation / leave',
  'Between seasons',
  'Land-based',
];

export const DEPARTMENTS = ['Bridge / Officers', 'Engineering', 'Interior', 'Galley', 'Deck'] as const;
export type Department = (typeof DEPARTMENTS)[number];

// Map a crew role to its department, so the deck can be filtered by department
// without storing a separate column.
const ROLE_DEPARTMENT: Record<string, Department> = {
  'Captain': 'Bridge / Officers',
  'First Officer': 'Bridge / Officers',
  '2nd Officer': 'Bridge / Officers',
  '3rd Officer': 'Bridge / Officers',
  'Chief Engineer': 'Engineering',
  '2nd Engineer': 'Engineering',
  '3rd Engineer': 'Engineering',
  'ETO': 'Engineering',
  'Chief Stewardess': 'Interior',
  '2nd Stewardess': 'Interior',
  '3rd Stewardess': 'Interior',
  'Stewardess': 'Interior',
  'Purser': 'Interior',
  'Chef': 'Galley',
  'Sous Chef': 'Galley',
  'Bosun': 'Deck',
  'Lead Deckhand': 'Deck',
  'Deckhand': 'Deck',
};

export function departmentForRole(role?: string | null): Department | null {
  if (!role) return null;
  return ROLE_DEPARTMENT[role] ?? null;
}

// Yacht-themed profile prompts (Hinge-style) — instantly signal the app is for
// crew the moment a profile is opened.
export const PROMPTS: string[] = [
  'Med or Caribbean?',
  'Charter or private?',
  'Best season I’ve done',
  'Worst guest story',
  'My dream itinerary',
  'The boat I’d love to work on',
  'How I spend my time off charter',
  'Marina I know far too well',
  'Why I got into yachting',
  'Most memorable port',
];

export interface ProfilePrompt {
  prompt: string;
  answer: string;
}
