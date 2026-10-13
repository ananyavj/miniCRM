
-- Day 11: PostgreSQL constraint tests
-- Each marked INSERT is expected to fail unless explicitly marked
-- as expected to succeed.

-- SETUP: Create a valid row for the duplicate-email test.
INSERT INTO leads (name, email, company, status, organization_id)
VALUES ('Constraint Test', 'constraint-test@example.com',
        'Test Company', 'new', 1);

-- TEST 1: Invalid status
-- Expected constraint: leads_status_check
INSERT INTO leads (name, email, company, status, organization_id)
VALUES ('Test Lead', 'badstatus@example.com', 'Test Co', 'banana', 1);

-- TEST 2: Empty name
-- Expected constraint: leads_name_not_blank
INSERT INTO leads (name, email, company, organization_id)
VALUES ('', 'emptyname@example.com', 'Test Co', 1);

-- TEST 3: Whitespace-only name
-- Expected constraint: leads_name_not_blank
INSERT INTO leads (name, email, company, organization_id)
VALUES ('   ', 'spacesname@example.com', 'Test Co', 1);

-- TEST 4: Whitespace-only company
-- Expected constraint: leads_company_not_blank
INSERT INTO leads (name, email, company, organization_id)
VALUES ('Test Lead', 'blankcompany@example.com', '   ', 1);

-- TEST 5: Email without @
-- Expected constraint: leads_email_check
INSERT INTO leads (name, email, company, organization_id)
VALUES ('Test Lead', 'invalidemail.com', 'Test Co', 1);

-- TEST 6: Duplicate email within the same organization
-- Expected constraint: leads_organization_email_unique
INSERT INTO leads (name, email, company, organization_id)
VALUES ('Duplicate Lead', 'constraint-test@example.com',
        'Test Co', 1);

-- TEST 7: NULL company
-- Expected: NOT NULL violation.
INSERT INTO leads (name, email, company, organization_id)
VALUES ('Test Lead', 'nullcompany@example.com', NULL, 1);

-- TEST 8: NULL name
-- Expected: NOT NULL violation.
INSERT INTO leads (name, email, company, organization_id)
VALUES (NULL, 'nullname@example.com', 'Test Co', 1);

-- TEST 9: Same email across different organizations
-- Expected: BOTH inserts succeed.
INSERT INTO leads (name, email, company, organization_id)
VALUES ('Shared Email Org 1', 'shared-email-test@example.com',
        'Test Company 1', 1);

INSERT INTO leads (name, email, company, organization_id)
VALUES ('Shared Email Org 2', 'shared-email-test@example.com',
        'Test Company 2', 2);

-- TEST 10: Duplicate email within one organization
-- Expected: first insert succeeds; second insert fails.
-- Expected constraint: leads_organization_email_unique
INSERT INTO leads (name, email, company, organization_id)
VALUES ('Same Org Email 1', 'same-org-test@example.com',
        'Test Company 1', 1);

INSERT INTO leads (name, email, company, organization_id)
VALUES ('Same Org Email 2', 'same-org-test@example.com',
        'Test Company 2', 1);

-- CLEANUP: Remove rows created by this test file.
DELETE FROM leads
WHERE email IN (
    'constraint-test@example.com',
    'shared-email-test@example.com',
    'same-org-test@example.com'
);
