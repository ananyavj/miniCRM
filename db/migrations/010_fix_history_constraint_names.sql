--db/migrations/010_fix_history_constraint_names.sql
-- Migration 008 was applied with two misspelled constraint names.
-- An applied migration must never be edited, so we rename them here instead.

ALTER TABLE lead_status_history
    RENAME CONSTRAINT lead_status_history_lead_orf_fkey
    TO lead_status_history_lead_org_fkey;

ALTER TABLE lead_status_history
    RENAME CONSTRAINT lead_status_history_user_orgfkey
    TO lead_status_history_user_org_fkey;
