export interface CrewProfile {
  id: string;
  name: string;
  role: string;
  experience: string;
  imageUrl: string;
  age?: number;
  nationality?: string;
  languages?: string[];
  certifications?: string[];
  interests?: string[];
  bio?: string;
  availability?: string;
} 