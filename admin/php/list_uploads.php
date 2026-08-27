<?php
require_once 'auth_check.php';
require_once 'db.php';

try {
    $pdo = getDB();
    $stmt = $pdo->query("SELECT id, arquivo, tipo, display_time, uploaded_at FROM midias ORDER BY uploaded_at DESC");
    $midias = [];
    while ($row = $stmt->fetch()) {
        $midias[] = [
            'id' => (int)$row['id'],
            'file' => $row['arquivo'],
            'type' => $row['tipo'],
            'display_time' => (int)$row['display_time'],
            'uploaded_at' => $row['uploaded_at']
        ];
    }
    echo json_encode($midias);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Erro ao listar mídias: ' . $e->getMessage()]);
}
?>