INSERT INTO leads (name, email, phone, company, status) VALUES
    ('Sophie Keller', 'sophie@example.ch', '+41791234567', 'Alpine Solutions', 'new'),
    ('Haruto Sato', 'haruto@example.jp', NULL, 'Sakura Technologies', 'contacted'),
    ('Valentina Cruz', 'valentina@example.mx', '+525512345678', 'Sol Digital', 'qualified'),
    ('Oliver Bennett', 'oliver@example.au', '+61412345678', 'Southern Cross Systems', 'new'),
    ('Aarav Mehta', 'aarav@example.in', NULL, 'Nimbus Innovations', 'contacted')
RETURNING *;