--db/migrations/008_lead_status_history.sql
CREATE TABLE lead_status_history(
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id integer NOT NULL,
    lead_id integer NOT NULL,
    changed_by integer,
    from_status text NOT NULL,
    to_status text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT NOW(),

    CONSTRAINT lead_status_history_lead_orf_fkey
        FOREIGN KEY(lead_id, organization_id)
        REFERENCES leads(id, organization_id)
        ON DELETE CASCADE,

    CONSTRAINT lead_status_history_user_orgfkey
        FOREIGN KEY (changed_by, organization_id)
        REFERENCES users (id, organization_id)
        ON DELETE SET NULL (changed_by)
);

CREATE INDEX lead_status_history_lead_idx
    ON lead_status_history (organization_id, lead_id, changed_at);
