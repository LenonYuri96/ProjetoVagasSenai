<?php
require_once 'config.php';

/**
 * Retorna uma instância PDO conectada ao banco.
 * Cria as tabelas automaticamente se não existirem.
 */
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            die(json_encode(['error' => 'Erro de conexão: ' . $e->getMessage()]));
        }
        // Cria as tabelas se não existirem
        criarTabelas($pdo);
    }
    return $pdo;
}

/**
 * Cria as tabelas 'usuarios' e 'midias' se não existirem.
 * Insere o usuário admin padrão se não houver nenhum.
 */
function criarTabelas(PDO $pdo) {
    // Tabela usuarios
    $sqlUsuarios = "
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario VARCHAR(50) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($sqlUsuarios);

    // Tabela midias
    $sqlMidias = "
        CREATE TABLE IF NOT EXISTS midias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            arquivo VARCHAR(255) NOT NULL,
            tipo ENUM('image','video') NOT NULL,
            display_time INT DEFAULT 5,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($sqlMidias);

    // Verifica se existe pelo menos um usuário, senão insere o admin padrão
    $stmt = $pdo->query("SELECT COUNT(*) FROM usuarios");
    $count = $stmt->fetchColumn();
    if ($count == 0) {
        $senhaHash = password_hash('Senai@2026', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO usuarios (usuario, senha) VALUES (?, ?)");
        $stmt->execute(['admin', $senhaHash]);
    }
}
?>