ALTER TABLE users
    ADD COLUMN password_hash text,
    ADD COLUMN role text NOT NULL DEFAULT 'member',

    ADD CONSTRAINT users_role_check
        CHECK(role IN('owner', 'member')),

    ADD CONSTRAINT users_email_unique
        UNIQUE(email),

    ADD CONSTRAINT users_email_check
        CHECK(POSITION('@' IN email) > 0),

    ADD CONSTRAINT users_name_not_blank
        CHECK(btrim(name) <> '');
