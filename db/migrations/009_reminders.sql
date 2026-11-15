--db/migrations/009_reminders.sql
CREATE TABLE reminders (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id integer NOT NULL,
    lead_id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    due_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),

    CONSTRAINT reminders_title_not_blank
        CHECK (btrim(title) <> ''),

    CONSTRAINT reminders_status_check
        CHECK (status IN('pending', 'sent', 'done')),

    CONSTRAINT reminders_lead_org_fkey
        FOREIGN KEY (lead_id, organization_id)
        REFERENCES leads (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT reminders_user_org_fkey
        FOREIGN KEY (user_id, organization_id)
        REFERENCES users (id, organization_id)
        ON DELETE RESTRICT
);

CREATE INDEX reminders_lead_due_idx
    ON reminders (organization_id, lead_id, due_at);

CREATE INDEX reminders_pending_due_idx
    ON reminders (due_at)
    WHERE status= 'pending';
