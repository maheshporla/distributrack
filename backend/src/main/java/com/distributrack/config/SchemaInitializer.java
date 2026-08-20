package com.distributrack.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * Runs one-time schema fixes on startup that Hibernate's ddl-auto=update
 * cannot handle (e.g. dropping NOT NULL constraints on MySQL).
 *
 * Each statement is idempotent — safe to run on every boot.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SchemaInitializer implements CommandLineRunner {

    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            // 1. Make delivery_boy_id nullable — Hibernate ddl-auto=update
            //    never drops NOT NULL on MySQL, so old columns stay NOT NULL.
            stmt.execute(
                "ALTER TABLE deliveries MODIFY COLUMN delivery_boy_id BIGINT NULL"
            );

            // 2. Add worker availability column if missing.
            var rs = conn.getMetaData().getColumns(
                    null, null, "users", "availability");
            if (!rs.next()) {
                stmt.execute(
                    "ALTER TABLE users ADD COLUMN availability " +
                    "VARCHAR(16) NOT NULL DEFAULT 'OFFLINE'"
                );
                log.info("SchemaInitializer: added users.availability column");
            }
            rs.close();

            log.info("SchemaInitializer: schema fixes applied successfully");

        } catch (Exception e) {
            // Non-fatal — the application continues even if the ALTER fails
            // (e.g. on a read-only database). Log and move on.
            log.warn("SchemaInitializer: could not apply schema fixes — {}",
                    e.getMessage());
        }
    }
}
