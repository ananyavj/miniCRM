--db/migrations/007_activities.sql
CREATE TABLE activities (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id integer NOT NULL,
    lead_id integer NOT NULL,
    user_id integer,
    type text NOT NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT NOW(),

    CONSTRAINT activities_type_check
        CHECK (type IN ('call', 'email', 'meeting', 'note')),

    CONSTRAINT activities_note_not_blank
        CHECK (note IS NULL OR btrim(note) <> ''),

    CONSTRAINT activities_lead_org_fkey
        FOREIGN KEY (lead_id, organization_id)
        REFERENCES leads (id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT activities_user_org_fkey
        FOREIGN KEY (user_id, organization_id)
        REFERENCES users (id, organization_id)
        ON DELETE SET NULL (user_id)
);

CREATE INDEX activities_lead_created_idx
    ON activities (organization_id, lead_id, created_at DESC);
