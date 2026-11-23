import type { Pool } from "mysql2/promise";

export async function ensureMawasimSchema(db: Pick<Pool, "query">) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS mawasim_seasons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hijriYear INT NOT NULL UNIQUE,
      title VARCHAR(160) NOT NULL,
      isOpen BOOLEAN NOT NULL DEFAULT FALSE,
      settings JSON NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS mawasim_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seasonId INT NOT NULL,
      mosqueId INT NULL,
      applicantId INT NULL,
      submittedBy INT NULL,
      mosqueName VARCHAR(255) NOT NULL,
      snapshot JSON NOT NULL,
      contact JSON NOT NULL,
      menPhoto LONGTEXT NOT NULL,
      womenPhoto LONGTEXT NULL,
      requested JSON NOT NULL,
      specialRequest TEXT NULL,
      status ENUM('submitted','approved','scheduled','completed','rejected') NOT NULL DEFAULT 'submitted',
      approved JSON NULL,
      reviewNote TEXT NULL,
      reviewedBy INT NULL,
      scheduledFor DATE NULL,
      assignedTo INT NULL,
      execution JSON NULL,
      executedBy INT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY mawasim_season_mosque (seasonId, mosqueId),
      KEY mawasim_assigned (assignedTo, seasonId),
      CONSTRAINT mawasim_request_season FOREIGN KEY (seasonId) REFERENCES mawasim_seasons(id),
      CONSTRAINT mawasim_request_mosque FOREIGN KEY (mosqueId) REFERENCES mosques(id) ON DELETE SET NULL,
      CONSTRAINT mawasim_request_applicant FOREIGN KEY (applicantId) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT mawasim_request_submitter FOREIGN KEY (submittedBy) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT mawasim_request_reviewer FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT mawasim_request_assignee FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT mawasim_request_executor FOREIGN KEY (executedBy) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS mawasim_grants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seasonId INT NOT NULL,
      mosqueId INT NOT NULL,
      userId INT NOT NULL,
      grantedBy INT NULL,
      reason VARCHAR(500) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY mawasim_grant_scope (seasonId, mosqueId, userId),
      KEY mawasim_grant_user (userId, seasonId),
      CONSTRAINT mawasim_grant_season FOREIGN KEY (seasonId) REFERENCES mawasim_seasons(id),
      CONSTRAINT mawasim_grant_mosque FOREIGN KEY (mosqueId) REFERENCES mosques(id) ON DELETE CASCADE,
      CONSTRAINT mawasim_grant_user_fk FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT mawasim_grant_actor FOREIGN KEY (grantedBy) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
