export interface CrewProfile {
  id: string;
  user_id: string;
  name: string;
  role: string;
  imageUrl: string;
  age?: number;
  nationality?: string;
  languages?: string[];
  interests?: string[];
  bio?: string;
  photos?: { url: string; order: number }[];
  last_seen?: string | null;
}
