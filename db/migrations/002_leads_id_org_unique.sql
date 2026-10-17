--db/migrations/002_leads_id_org_unique.sql
ALTER TABLE leads
ADD CONSTRAINT leads_id_organization_id_unique
UNIQUE (id, organization_id);
