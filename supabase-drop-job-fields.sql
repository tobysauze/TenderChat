-- Tender is now a dating app for yachties, not a crew-recruitment tool.
-- Drop the job-oriented profile columns. Role, languages and interests
-- stay (role is yachtie identity, the others are dating-relevant).
--
-- Destructive and irreversible — any data in these columns is lost.
ALTER TABLE profiles DROP COLUMN IF EXISTS experience;
ALTER TABLE profiles DROP COLUMN IF EXISTS certifications;
ALTER TABLE profiles DROP COLUMN IF EXISTS availability;
