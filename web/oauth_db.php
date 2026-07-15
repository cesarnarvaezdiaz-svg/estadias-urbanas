<?php
if (!function_exists('oauth_get_db_connection')) {
    function oauth_get_db_connection(): ?PDO {
        $host = oauth_env('DB_HOST', defined('DB_HOST') ? DB_HOST : 'localhost');
        $dbname = oauth_env('DB_NAME', defined('DB_NAME') ? DB_NAME : '');
        $username = oauth_env('DB_USER', defined('DB_USER') ? DB_USER : '');
        $password = oauth_env('DB_PASS', defined('DB_PASS') ? DB_PASS : '');

        if ($dbname === '' || $username === '' || $password === '' || $username === 'TU_USUARIO' || $password === 'TU_PASSWORD') {
            error_log('oauth_db_config_missing');
            return null;
        }

        try {
            return new PDO(
                "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
                $username,
                $password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
        } catch (PDOException $e) {
            error_log('oauth_db_connection_error: ' . $e->getMessage());
            return null;
        }
    }
}

if (!function_exists('oauth_bootstrap_users_table')) {
    function oauth_bootstrap_users_table(PDO $pdo): void {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(190) NOT NULL,
            email VARCHAR(190) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            phone VARCHAR(60) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_users_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        foreach ([
            "ALTER TABLE `users` ADD COLUMN phone VARCHAR(60) NOT NULL DEFAULT '' AFTER password_hash",
            "ALTER TABLE `users` ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER phone",
            "ALTER TABLE `users` ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
            "ALTER TABLE `users` ADD UNIQUE KEY uniq_users_email (email)",
        ] as $sql) {
            try {
                $pdo->exec($sql);
            } catch (Throwable $e) {
                // Existing HostGator tables may already include this column/key.
            }
        }
    }
}
?>
