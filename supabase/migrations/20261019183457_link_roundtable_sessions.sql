-- Structured session linkage; availability remains private scheduling input.
-- Episode pages may exist before a meetup_episodes row is persisted.
BEGIN;
ALTER TABLE public.roundtable_questions
  ADD COLUMN session_date date,
  ADD COLUMN episode_number integer,
  ADD CONSTRAINT roundtable_questions_episode_number_valid
    CHECK (episode_number IS NULL OR episode_number BETWEEN 1 AND 999),
  ADD CONSTRAINT roundtable_questions_session_pair
    CHECK ((session_date IS NULL) = (episode_number IS NULL));
CREATE INDEX roundtable_questions_episode_idx
  ON public.roundtable_questions (episode_number, session_date)
  WHERE status IN ('scheduled', 'completed');
COMMENT ON COLUMN public.roundtable_questions.session_date IS
  'Actual scheduled/discussed session date in Asia/Shanghai; not submitter availability.';
COMMENT ON COLUMN public.roundtable_questions.episode_number IS
  'Inspire Planet (meetup 39) episode number; year comes from session_date.';
COMMIT;
