--db/migrations/006_lead_indexes.sql
CREATE INDEX IF NOT EXISTS leads_org_status_idx
    ON leads (organization_id, status);

CREATE INDEX IF NOT EXISTS leads_org_assigned_idx
    ON leads (organization_id, assigned_to);
