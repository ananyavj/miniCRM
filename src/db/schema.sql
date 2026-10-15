
CREATE TABLE IF NOT EXISTS organizations (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT users_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE RESTRICT,
    CONSTRAINT users_id_organization_id_unique
        UNIQUE (id, organization_id)
);

CREATE TABLE IF NOT EXISTS leads (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    company text NOT NULL,
    status text NOT NULL DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT NOW(),
    organization_id integer NOT NULL,
    assigned_to integer,

    CONSTRAINT leads_status_check
        CHECK (status IN ('new', 'contacted', 'qualified', 'lost')),
    CONSTRAINT leads_name_not_blank
        CHECK (btrim(name) <> ''),
    CONSTRAINT leads_company_not_blank
        CHECK (btrim(company) <> ''),
    CONSTRAINT leads_email_check
        CHECK (POSITION('@' IN email) > 0),
    CONSTRAINT leads_organization_email_unique
        UNIQUE (organization_id, email),
    CONSTRAINT leads_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE RESTRICT,
    CONSTRAINT leads_assigned_to_org_fkey
        FOREIGN KEY (assigned_to, organization_id)
        REFERENCES users(id, organization_id)
        ON DELETE SET NULL (assigned_to)
);
