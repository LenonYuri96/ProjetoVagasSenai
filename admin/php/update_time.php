<?php
session_start();
require_once 'auth_check.php';
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$id = (int)$data['id'];
$display_time = (int)$data['display_time'];

try {
    $pdo = getDB();
    $stmt = $pdo->prepare("UPDATE midias SET display_time = ? WHERE id = ?");
    $stmt->execute([$display_time, $id]);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erro ao atualizar tempo: ' . $e->getMessage()]);
}
?>