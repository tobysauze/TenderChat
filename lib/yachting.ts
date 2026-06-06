// Yachting-specific reference data that makes Tender a dating app built around
// how yacht crew actually live and meet — clustered in a handful of marinas and
// organised entirely around the season. Used across profile setup, the deck and
// filtering.

// Comprehensive list of the marinas, ports and refit yards where superyacht
// crew actually live and work, grouped loosely by cruising ground. Stored on
// the profile as plain text. Where a single city has multiple iconic marinas
// (Palma, Phuket, Athens, Antigua) we list them separately.
export const MARINAS: string[] = [
  // Côte d'Azur — France
  'Antibes (Port Vauban)',
  'Monaco (Port Hercule)',
  'Monaco (Port de Fontvieille)',
  'Cannes',
  'Nice',
  'Villefranche-sur-Mer',
  'Beaulieu-sur-Mer',
  'Saint-Jean-Cap-Ferrat',
  'Golfe-Juan',
  'Saint-Tropez',
  'Sainte-Maxime',
  'La Ciotat',
  'Marseille',
  'Toulon',
  'Hyères',
  'Bormes-les-Mimosas',
  // Corsica
  'Calvi (Corsica)',
  'Ajaccio (Corsica)',
  'Bonifacio (Corsica)',
  // Italy — Ligurian / Tyrrhenian
  'Sanremo',
  'Imperia',
  'Loano',
  'Genoa',
  'Portofino',
  'La Spezia',
  'Viareggio',
  'Livorno',
  // Italy — Sardinia
  'Porto Cervo (Sardinia)',
  'Porto Rotondo (Sardinia)',
  'Olbia (Sardinia)',
  'Cagliari (Sardinia)',
  // Italy — South & Sicily
  'Naples',
  'Capri',
  'Amalfi',
  'Gaeta',
  'Bari',
  'Palermo (Sicily)',
  // Spain — Balearics
  'Palma de Mallorca',
  'Port Adriano (Mallorca)',
  'Puerto Portals (Mallorca)',
  'Ibiza',
  'Formentera',
  'Mahón (Menorca)',
  // Spain — mainland
  'Barcelona',
  'Valencia',
  'Tarragona',
  'Palamós',
  'Puerto Banús (Marbella)',
  'Sotogrande',
  'Málaga',
  // Gibraltar & Malta
  'Gibraltar',
  'Valletta (Malta)',
  // Greece
  'Athens (Marina Zeas)',
  'Athens (Flisvos)',
  'Athens (Alimos)',
  'Mykonos',
  'Santorini',
  'Corfu',
  'Rhodes',
  'Crete (Heraklion)',
  // Adriatic
  'Split (ACI)',
  'Dubrovnik (ACI)',
  'Hvar',
  'Trogir',
  'Šibenik',
  'Pula',
  'Tivat (Porto Montenegro)',
  // Turkey
  'Bodrum (Yalikavak)',
  'Marmaris',
  'Göcek',
  'Antalya',
  // Caribbean — Lesser Antilles
  'Antigua (English Harbour)',
  'Antigua (Falmouth Harbour)',
  'Antigua (Jolly Harbour)',
  'Sint Maarten (Simpson Bay)',
  'St. Barths (Gustavia)',
  'St. Lucia (Rodney Bay)',
  'Grenada (Port Louis)',
  'Martinique',
  'Guadeloupe',
  'BVI (Tortola)',
  'BVI (Virgin Gorda — YCCS)',
  'St. Thomas (Yacht Haven Grande)',
  // Bahamas & Turks
  'Nassau (Bahamas)',
  'Albany (Bahamas)',
  'Bimini (Bahamas)',
  'Exuma (Bahamas)',
  'Turks & Caicos',
  // USA — East Coast / Florida
  'Fort Lauderdale',
  'Miami',
  'Palm Beach (Rybovich)',
  'Naples (Florida)',
  'Key West',
  'Charleston',
  'Annapolis',
  'New York',
  'Newport (RI)',
  'Nantucket',
  'Bar Harbor (Maine)',
  // USA — West Coast
  'San Diego',
  'Los Angeles (Marina del Rey)',
  'Newport Beach (CA)',
  'San Francisco',
  'Seattle',
  // Canada
  'Vancouver',
  'Victoria (BC)',
  // Mexico / Central America
  'Cabo San Lucas',
  'La Paz (Mexico)',
  'Puerto Vallarta',
  'Panama (Shelter Bay)',
  'Costa Rica (Los Sueños)',
  // Middle East
  'Dubai (Dubai Marina)',
  'Abu Dhabi (Yas Marina)',
  'Doha (Qatar)',
  'Muscat (Oman)',
  // Atlantic Islands
  'Madeira (Funchal)',
  'Las Palmas (Canaries)',
  'Tenerife',
  'Azores (Horta)',
  // UK & Northern Europe
  'Southampton',
  'Cowes (Isle of Wight)',
  'Poole',
  'Plymouth',
  'Falmouth (UK)',
  'London (St Katharine Docks)',
  'Guernsey',
  'Jersey',
  'Amsterdam',
  'IJmuiden',
  'Rotterdam',
  'Hamburg',
  'Kiel',
  'Copenhagen',
  'Stockholm',
  'Oslo',
  'Bergen',
  'Reykjavík',
  // Asia
  'Phuket (Yacht Haven)',
  'Phuket (Royal Phuket Marina)',
  'Phuket (Boat Lagoon)',
  'Langkawi',
  'Singapore (ONE°15)',
  'Singapore (Sentosa Cove)',
  'Bali (Benoa)',
  'Hong Kong',
  'Tokyo',
  // Indian Ocean
  'Maldives',
  'Seychelles',
  'Mauritius',
  // Australia / NZ
  'Sydney',
  'Gold Coast',
  'Brisbane',
  'Melbourne',
  'Fremantle (Perth)',
  'Hobart (Tasmania)',
  'Auckland',
  // Africa
  'Cape Town (V&A Waterfront)',
  // Catch-alls
  'Crossing / Delivery',
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
