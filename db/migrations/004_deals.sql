--db/migrations/004_deals.sql
CREATE TABLE deals (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id integer NOT NULL,
    lead_id integer NOT NULL,
    title text NOT NULL,
    value_cents integer NOT NULL DEFAULT 0,
    stage text NOT NULL DEFAULT 'prospecting',

    CONSTRAINT deals_title_not_blank
    CHECK (length(trim(title)) > 0),

    CONSTRAINT deals_value_cents_check
    CHECK (value_cents >= 0),

    CONSTRAINT deals_stage_check
    CHECK(
        stage IN(
            'prospecting',
            'proposal',
            'negotiation',
            'won',
            'lost'
        )
    ),

    CONSTRAINT deals_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    CONSTRAINT deals_lead_org_fkey
        FOREIGN KEY (lead_id, organization_id)
        REFERENCES leads(id, organization_id)
        ON DELETE RESTRICT

);
