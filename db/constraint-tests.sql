
-- Day 11: PostgreSQL constraint tests
-- Each marked INSERT is expected to fail.

-- Setup: create one valid row for the duplicate-email test.
INSERT INTO leads (name, email, company, status)
VALUES ('Constraint Test', 'constraint-test@example.com',
        'Test Company', 'new');

-- TEST 1: Invalid status
-- Expected constraint: leads_status_check
INSERT INTO leads (name, email, company, status)
VALUES ('Test Lead', 'badstatus@example.com', 'Test Co', 'banana');

-- TEST 2: Empty name
-- Expected constraint: leads_name_not_blank
INSERT INTO leads (name, email, company)
VALUES ('', 'emptyname@example.com', 'Test Co');

-- TEST 3: Whitespace-only name
-- Expected constraint: leads_name_not_blank
INSERT INTO leads (name, email, company)
VALUES ('   ', 'spacesname@example.com', 'Test Co');

-- TEST 4: Whitespace-only company
-- Expected constraint: leads_company_not_blank
INSERT INTO leads (name, email, company)
VALUES ('Test Lead', 'blankcompany@example.com', '   ');

-- TEST 5: Email without @
-- Expected constraint: leads_email_check
INSERT INTO leads (name, email, company)
VALUES ('Test Lead', 'invalidemail.com', 'Test Co');

-- TEST 6: Duplicate email
-- Expected constraint: leads_email_key or leads_email_unique,
-- depending on which UNIQUE constraint exists.
INSERT INTO leads (name, email, company)
VALUES ('Duplicate Lead', 'constraint-test@example.com', 'Test Co');

-- TEST 7: NULL company
-- Expected: NOT NULL violation.
INSERT INTO leads (name, email, company)
VALUES ('Test Lead', 'nullcompany@example.com', NULL);

-- TEST 8: NULL name
-- Expected: NOT NULL violation.
INSERT INTO leads (name, email, company)
VALUES (NULL, 'nullname@example.com', 'Test Co');

-- Cleanup: remove the valid setup row.
DELETE FROM leads
WHERE email = 'constraint-test@example.com';
