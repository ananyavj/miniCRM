-- db/seed.sql


-- Seed the demo organization.
-- This seed is intended for a fresh database and should be run once.

INSERT INTO organizations (name)
VALUES ('MiniCRM Demo Organization')
RETURNING id;

-- Insert the sample leads into the demo organization.
WITH demo_org AS (
    SELECT id
    FROM organizations
    WHERE name = 'MiniCRM Demo Organization'
    ORDER BY id DESC
    LIMIT 1
)
INSERT INTO leads (
    name,
    email,
    phone,
    company,
    status,
    organization_id
)
SELECT
    sample.name,
    sample.email,
    sample.phone,
    sample.company,
    sample.status,
    demo_org.id
FROM (
    VALUES
        ('Sophie Keller', 'sophie@example.ch', '+41791234567', 'Alpine Solutions', 'new'),
        ('Haruto Sato', 'haruto@example.jp', NULL, 'Sakura Technologies', 'contacted'),
        ('Valentina Cruz', 'valentina@example.mx', '+525512345678', 'Sol Digital', 'qualified'),
        ('Oliver Bennett', 'oliver@example.au', '+61412345678', 'Southern Cross Systems', 'new'),
        ('Aarav Mehta', 'aarav@example.in', NULL, 'Nimbus Innovations', 'contacted')
) AS sample(name, email, phone, company, status)
CROSS JOIN demo_org
RETURNING *;
