export interface CompletionInput {
  name?: string;
  role?: string;
  experience?: string;
  age?: number;
  nationality?: string;
  bio?: string;
  availability?: string;
  languages?: string[];
  certifications?: string[];
  interests?: string[];
  photoCount?: number;
}

export interface CompletionResult {
  percent: number;
  missing: string[];
}

const FIELDS: { key: keyof CompletionInput | 'photos'; label: string; check: (i: CompletionInput) => boolean }[] = [
  { key: 'name', label: 'Name', check: i => !!i.name?.trim() },
  { key: 'role', label: 'Role', check: i => !!i.role?.trim() },
  { key: 'experience', label: 'Experience', check: i => !!i.experience?.trim() },
  { key: 'age', label: 'Age', check: i => !!i.age && i.age > 0 },
  { key: 'nationality', label: 'Nationality', check: i => !!i.nationality?.trim() },
  { key: 'bio', label: 'Bio', check: i => !!i.bio && i.bio.trim().length >= 30 },
  { key: 'availability', label: 'Availability', check: i => !!i.availability?.trim() },
  { key: 'languages', label: 'At least one language', check: i => (i.languages?.length || 0) > 0 },
  { key: 'certifications', label: 'At least one certification', check: i => (i.certifications?.length || 0) > 0 },
  { key: 'interests', label: 'At least one interest', check: i => (i.interests?.length || 0) > 0 },
  { key: 'photos', label: 'At least one photo', check: i => (i.photoCount || 0) > 0 },
];

export function computeCompletion(input: CompletionInput): CompletionResult {
  const filled = FIELDS.filter(f => f.check(input));
  const missing = FIELDS.filter(f => !f.check(input)).map(f => f.label);
  return {
    percent: Math.round((filled.length / FIELDS.length) * 100),
    missing,
  };
}
