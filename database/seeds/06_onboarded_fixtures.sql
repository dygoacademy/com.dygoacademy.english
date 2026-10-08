-- seeds/06_onboarded_fixtures.sql — mark every seeded account as onboarded.
--
-- A fresh build applies migrations/ before the seeds, so the accounts the
-- seeds create come after 20261008_onboarding.sql's backfill and would
-- otherwise be sent through onboarding (OB1–OB5) on their first visit to
-- the garden. Test and demo accounts start in the garden, like the real
-- learners the migration backfilled. Re-runnable.

update public.profiles set onboarded_at = created_at where onboarded_at is null;
