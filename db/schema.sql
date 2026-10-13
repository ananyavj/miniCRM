
CREATE TABLE leads (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    company text NOT NULL,
    status text NOT NULL DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT NOW(),

    CONSTRAINT leads_status_check
        CHECK (status IN ('new', 'contacted', 'qualified', 'lost')),

    CONSTRAINT leads_name_not_blank
        CHECK (btrim(name) <> ''),

    CONSTRAINT leads_company_not_blank
        CHECK (btrim(company) <> ''),

    CONSTRAINT leads_email_check
        CHECK (POSITION('@' IN email) > 0),

    CONSTRAINT leads_email_unique
        UNIQUE (email)
);
