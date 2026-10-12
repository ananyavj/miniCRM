CREATE TABLE leads (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    company text NOT NULL,
    status text NOT NULL DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT NOW()
);