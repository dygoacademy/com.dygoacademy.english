/**
 * `srs_rating` enum, database/migrations/001_initial_schema.sql line 35 —
 * also the canonical enum example in the tech spec §3.2. Drives the
 * mistake-weighted retention formula (Phase 2, Module 3); the study
 * session UI (Phase 0 wireframe implementation) collects one of these
 * four per card even where the student only sees two buttons — see
 * components/flashcard/RatingButtons.tsx.
 */
export type SrsRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
