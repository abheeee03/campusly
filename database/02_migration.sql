-- Migration: Add missing required fields for club management platform
-- Extends 01_init.sql without breaking existing data

-- 1. clubs: add description for richer club info (optional but useful for management)
ALTER TABLE clubs ADD COLUMN description VARCHAR(500) NULL AFTER slogan;

-- 2. users: increase password length to safely store bcrypt hashes (255 recommended)
-- and add createdAt for audit
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL;
ALTER TABLE users ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER club_code;

-- 3. events: add ownership, publishing workflow, venue, capacity, banner and fix event_date
-- club_code links event to a club (NULL allowed for global events)
ALTER TABLE events ADD COLUMN club_code VARCHAR(10) NULL AFTER description;
ALTER TABLE events ADD CONSTRAINT fk_events_club_code FOREIGN KEY (club_code) REFERENCES clubs(code) ON DELETE SET NULL ON UPDATE CASCADE;

-- created_by tracks which user/admin created the event
ALTER TABLE events ADD COLUMN created_by INT NULL AFTER club_code;
ALTER TABLE events ADD CONSTRAINT fk_events_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- status enables draft -> published -> cancelled workflow (requirement: "publish")
ALTER TABLE events ADD COLUMN status ENUM('draft','published','cancelled') NOT NULL DEFAULT 'published' AFTER created_by;

-- venue/location
ALTER TABLE events ADD COLUMN location VARCHAR(255) NULL AFTER status;

-- capacity / max participants
ALTER TABLE events ADD COLUMN capacity INT NULL AFTER location;

-- banner image
ALTER TABLE events ADD COLUMN banner VARCHAR(500) NULL AFTER capacity;

-- keep original createdAt, add updatedAt
ALTER TABLE events ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt;

-- fix event_date: DATE loses time, promote to DATETIME to store date+time
ALTER TABLE events MODIFY COLUMN event_date DATETIME NOT NULL;

-- 4. registrations: add audit, status, and uniqueness
ALTER TABLE registrations ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER event_id;
ALTER TABLE registrations ADD COLUMN status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed' AFTER createdAt;

-- prevent duplicate registrations at DB level
ALTER TABLE registrations ADD CONSTRAINT uq_registration UNIQUE (student_id, event_id);

-- ensure FKs cascade on delete (re-create FKs if needed - MySQL requires drop first if exists)
-- Note: if FK names differ, adjust. These are idempotent guards: drop if exists then add.
-- For fresh DB from 01_init.sql, the FKs have auto-generated names; the UNIQUE and new FKs below will work on new deploys.
-- If migrating existing DB, run:
-- ALTER TABLE registrations DROP FOREIGN KEY registrations_ibfk_1;
-- ALTER TABLE registrations DROP FOREIGN KEY registrations_ibfk_2;
-- ALTER TABLE registrations ADD CONSTRAINT fk_reg_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE registrations ADD CONSTRAINT fk_reg_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
