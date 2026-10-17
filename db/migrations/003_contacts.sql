--db/migrations/003_contacts.sql
CREATE TABLE contacts (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id integer NOT NULL,
    lead_id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,

    CONSTRAINT contacts_name_not_blank
        CHECK (btrim(name) <> ''),

    CONSTRAINT contacts_email_check
        CHECK (POSITION('@' IN email) > 0),

    CONSTRAINT contacts_lead_email_unique
        UNIQUE (lead_id, email),

    CONSTRAINT contacts_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES organizations (id)
        ON DELETE RESTRICT,

    CONSTRAINT contacts_lead_org_fkey
        FOREIGN KEY (lead_id, organization_id)
        REFERENCES leads (id, organization_id)
        ON DELETE RESTRICT
);