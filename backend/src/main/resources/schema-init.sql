-- Fix delivery_boy_id NOT NULL constraint that Hibernate ddl-auto=update
-- cannot drop on MySQL. This runs on every startup (IFNULL is idempotent).
ALTER TABLE deliveries MODIFY COLUMN delivery_boy_id BIGINT NULL;

-- Add worker availability column (if not already present).
-- AVAILABLE: can receive new deliveries
-- BUSY:      currently delivering
-- OFFLINE:   not accepting deliveries
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'availability'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN availability VARCHAR(16) NOT NULL DEFAULT ''OFFLINE''',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
