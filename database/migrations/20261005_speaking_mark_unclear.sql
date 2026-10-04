-- Phase 13 S18: speaking_attempts.word_marks can hold `unclear` (a word the
-- speech scorer heard unclearly or as another word, POST /speaking/check).
-- word_marks is only checked to be a JSON array, so no constraint changes;
-- the API validates reasons (SPEAKING_MARK_REASONS). What the scorer
-- `heard` is never stored (D2): marks are {index, ok, reason} only.
comment on column public.speaking_attempts.word_marks is
  'Phase 13: one entry per word of the sentence, {index, ok, reason}; reason: '
  'stress_soft|missing|rushed|slow|unclear|null (unclear: server check, S18). '
  'No audio and no transcript are stored (D2).';
