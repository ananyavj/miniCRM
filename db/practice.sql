SELECT * FROM leads;

SELECT * FROM leads 
WHERE status = 'contacted';

SELECT * FROM leads
ORDER BY name ASC;

INSERT INTO leads (name, email, company) 
VALUES ('Test Lead', 'test@example.com', 'Test Company')
RETURNING *;

UPDATE leads 
SET status = 'qualified'
WHERE email = 'test@example.com'
RETURNING *;

DELETE FROM leads
WHERE email = 'test@example.com'
RETURNING *;

SELECT status, COUNT(*)
FROM leads
GROUP BY status
ORDER BY status;

SELECT * FROM leads
WHERE phone = NULL;

SELECT * FROM leads
WHERE phone IS NULL;

INSERT INTO leads (email, company)
VALUES ('missing-name@example.com', 'Test Company');

-- Test 1: Duplicate primary key (expected to fail)
INSERT INTO leads (id, name, email, company)
OVERRIDING SYSTEM VALUE
VALUES (1, 'Duplicate Lead', 'duplicate@example.com', 'Test Company');

-- Test 2: Invalid status (currently expected to succeed)
INSERT INTO leads (name, email, company, status)
VALUES ('Invalid Status Test', 'banana@example.com', 'Test Company', 'banana')
RETURNING *;

-- Test 3: Count leads by status
SELECT status, COUNT(*)
FROM leads
GROUP BY status
ORDER BY status;

-- Test 4: Find leads with missing phone numbers
SELECT name, phone
FROM leads
WHERE phone IS NULL;

-- Test 5: Final total row count
SELECT COUNT(*) AS total_leads FROM leads;