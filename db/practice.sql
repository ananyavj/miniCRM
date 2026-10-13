
-- ============================================================
-- miniCRM: COMPLETE SQL PRACTICE AND TEST SUITE
-- Requires the current populated minicrm database.
--
-- Current data:
--   Organizations: Acme Ltd (1), Northstar Ltd (2)
--   Users: Maya (1), Daniel (2), Priya (3), Leo (4)
--   Leads: Sophie (1), Haruto (2), Valentina (3),
--          Oliver (4), Aarav (5)
--
-- Expected failures are isolated in transactions.
-- Run using psql: \i db/practice.sql
-- ============================================================


-- ============================================================
-- SECTION 1: BASIC SELECT QUERIES
-- ============================================================

-- Test 1: Display all leads
SELECT * FROM leads ORDER BY id;

-- Test 2: Find contacted leads
SELECT *
FROM leads
WHERE status = 'contacted';

-- Test 3: Sort leads alphabetically
SELECT *
FROM leads
ORDER BY name ASC;

-- Test 4: Find leads without phone numbers
SELECT name, phone
FROM leads
WHERE phone IS NULL;

-- Test 5: Demonstrate why = NULL does not work
-- Expected: zero rows, even for leads without phone numbers
SELECT *
FROM leads
WHERE phone = NULL;

-- Test 6: Count leads by status
SELECT status, COUNT(*) AS lead_count
FROM leads
GROUP BY status
ORDER BY status;

-- Test 7: Count all leads
SELECT COUNT(*) AS total_leads
FROM leads;


-- ============================================================
-- SECTION 2: CREATE, UPDATE AND DELETE
-- The transaction is rolled back so no test lead remains.
-- ============================================================

BEGIN;

-- Test 8: Create a lead
INSERT INTO leads
    (name, email, company, status, organization_id)
VALUES
    ('Practice Lead', 'practice-crud@example.com',
     'Practice Company', 'new', 1)
RETURNING *;

-- Test 9: Update the test lead
UPDATE leads
SET status = 'qualified'
WHERE email = 'practice-crud@example.com'
RETURNING *;

-- Test 10: Delete the test lead
DELETE FROM leads
WHERE email = 'practice-crud@example.com'
RETURNING *;

ROLLBACK;


-- ============================================================
-- SECTION 3: NOT NULL CONSTRAINTS
-- Each insert below is EXPECTED TO FAIL.
-- ============================================================

-- Test 11: Missing name
BEGIN;
INSERT INTO leads (email, company, organization_id)
VALUES ('missing-name-practice@example.com', 'Test Company', 1);
ROLLBACK;

-- Test 12: Missing email
BEGIN;
INSERT INTO leads (name, company, organization_id)
VALUES ('Missing Email Test', 'Test Company', 1);
ROLLBACK;

-- Test 13: Missing company
BEGIN;
INSERT INTO leads (name, email, organization_id)
VALUES ('Missing Company Test', 'missing-company-practice@example.com', 1);
ROLLBACK;


-- ============================================================
-- SECTION 4: CHECK AND UNIQUE CONSTRAINTS
-- Each insert below is EXPECTED TO FAIL.
-- ============================================================

-- Test 14: Duplicate primary key
BEGIN;
INSERT INTO leads
    (id, name, email, company, organization_id)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 'Duplicate ID Test', 'duplicate-id-practice@example.com',
     'Test Company', 1);
ROLLBACK;

-- Test 15: Invalid status
BEGIN;
INSERT INTO leads (name, email, company, status, organization_id)
VALUES
    ('Invalid Status Test', 'invalid-status-practice@example.com',
     'Test Company', 'banana', 1);
ROLLBACK;

-- Test 16: Blank name
BEGIN;
INSERT INTO leads (name, email, company, organization_id)
VALUES
    ('   ', 'blank-name-practice@example.com', 'Test Company', 1);
ROLLBACK;

-- Test 17: Blank company
BEGIN;
INSERT INTO leads (name, email, company, organization_id)
VALUES
    ('Blank Company Test', 'blank-company-practice@example.com', '   ', 1);
ROLLBACK;

-- Test 18: Email without @
BEGIN;
INSERT INTO leads (name, email, company, organization_id)
VALUES
    ('Invalid Email Test', 'not-an-email', 'Test Company', 1);
ROLLBACK;

-- Test 19: Duplicate email
-- Sophie already uses sophie@example.ch
BEGIN;
INSERT INTO leads (name, email, company, organization_id)
VALUES
    ('Duplicate Email Test', 'sophie@example.ch', 'Test Company', 1);
ROLLBACK;


-- ============================================================
-- SECTION 5: FOREIGN KEY CONSTRAINTS
-- Each invalid operation is EXPECTED TO FAIL.
-- ============================================================

-- Test 20: Lead references nonexistent organization 99999
BEGIN;
INSERT INTO leads (name, email, company, organization_id)
VALUES
    ('Invalid Organization Test', 'invalid-org-practice@example.com',
     'Test Company', 99999);
ROLLBACK;

-- Test 21: User references nonexistent organization 99999
BEGIN;
INSERT INTO users (organization_id, name, email)
VALUES (99999, 'Invalid Organization User', 'invalid-user-practice@example.com');
ROLLBACK;

-- Test 22: Assign lead to nonexistent user 99999
BEGIN;
UPDATE leads
SET assigned_to = 99999
WHERE id = 1;
ROLLBACK;

-- Test 23: Delete organization 1 while leads/users reference it
BEGIN;
DELETE FROM organizations
WHERE id = 1;
ROLLBACK;


-- ============================================================
-- SECTION 6: ON DELETE SET NULL
-- The user deletion is rolled back after inspection.
-- ============================================================

-- Test 24: Deleting Maya should temporarily unassign Sophie's lead
BEGIN;

DELETE FROM users
WHERE id = 1
RETURNING *;

SELECT id, name, assigned_to
FROM leads
WHERE id = 1;

ROLLBACK;

-- After rollback, Sophie should again be assigned to user 1.
SELECT id, name, assigned_to
FROM leads
WHERE id = 1;


-- ============================================================
-- SECTION 7: INNER JOIN AND LEFT JOIN
-- ============================================================

-- Test 25: Every lead with its organization name
SELECT
    l.id,
    l.name AS lead_name,
    o.name AS organization_name
FROM leads AS l
INNER JOIN organizations AS o
    ON l.organization_id = o.id
ORDER BY l.id;

-- Test 26: Leads with assigned users only
-- Expected: 3 rows
SELECT
    l.id,
    l.name AS lead_name,
    u.name AS assigned_user
FROM leads AS l
INNER JOIN users AS u
    ON l.assigned_to = u.id
ORDER BY l.id;

-- Test 27: All leads, including unassigned leads
-- Expected: 5 rows
SELECT
    l.id,
    l.name AS lead_name,
    u.name AS assigned_user
FROM leads AS l
LEFT JOIN users AS u
    ON l.assigned_to = u.id
ORDER BY l.id;

-- Test 28: Lead count for each organization
-- Expected: Acme = 2, Northstar = 3
SELECT
    o.id,
    o.name AS organization_name,
    COUNT(l.id) AS lead_count
FROM organizations AS o
LEFT JOIN leads AS l
    ON l.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.id;

-- Test 29: Users with no assigned leads
-- Expected: Leo Martin only
SELECT
    u.id,
    u.name,
    u.organization_id
FROM users AS u
LEFT JOIN leads AS l
    ON l.assigned_to = u.id
WHERE l.id IS NULL
ORDER BY u.id;


-- ============================================================
-- SECTION 8: MULTI-TENANT DATA ISOLATION
-- ============================================================

-- Test 30: Fetch all leads belonging to organization 1
-- Expected: Sophie Keller and Haruto Sato
SELECT id, name, organization_id
FROM leads
WHERE organization_id = 1
ORDER BY id;

-- Test 31: Attempt to fetch organization 2's lead
-- while scoped to organization 1.
-- Expected: zero rows
SELECT id, name, organization_id
FROM leads
WHERE id = 3
  AND organization_id = 1;

-- Test 32: Update a lead only within organization 1
-- Expected: one row updated
-- Rollback preserves the original status.
BEGIN;

UPDATE leads
SET status = 'contacted'
WHERE id = 1
  AND organization_id = 1
RETURNING id, name, status, organization_id;

ROLLBACK;

-- Test 33: Delete a lead only within organization 1
-- Lead 3 belongs to organization 2.
-- Expected: zero rows deleted.
BEGIN;

DELETE FROM leads
WHERE id = 3
  AND organization_id = 1
RETURNING *;

ROLLBACK;


-- ============================================================
-- SECTION 9: IMPORTANT MULTI-TENANCY SCHEMA WEAKNESS
-- Current schema permits cross-organization assignment.
-- This test EXPECTS the update to succeed with current schema.
-- The transaction rolls back the change.
-- ============================================================

-- Test 34: Lead 1 belongs to organization 1.
-- User 3 belongs to organization 2.
BEGIN;

UPDATE leads
SET assigned_to = 3
WHERE id = 1
RETURNING id, name, organization_id, assigned_to;

SELECT
    l.id,
    l.name AS lead_name,
    l.organization_id AS lead_organization,
    u.name AS assigned_user,
    u.organization_id AS user_organization
FROM leads AS l
JOIN users AS u
    ON l.assigned_to = u.id
WHERE l.id = 1;

ROLLBACK;


-- ============================================================
-- SECTION 10: FINAL DATA INTEGRITY CHECKS
-- ============================================================

-- Test 35: Final lead count should remain 5
SELECT COUNT(*) AS total_leads
FROM leads;

-- Test 36: Verify lead assignments were restored
SELECT id, name, organization_id, assigned_to
FROM leads
ORDER BY id;

-- Test 37: Verify users remain intact
SELECT id, name, organization_id
FROM users
ORDER BY id;

-- Test 38: Verify organization counts
SELECT
    o.name AS organization_name,
    COUNT(l.id) AS lead_count
FROM organizations AS o
LEFT JOIN leads AS l
    ON l.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.id;

-- End of practice suite.
