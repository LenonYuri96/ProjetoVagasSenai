<?php
session_start();
require_once 'auth_check.php';
require_once 'db.php';
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$id = (int)$data['id'];

try {
    $pdo = getDB();

    // Buscar arquivo para deletar fisicamente
    $stmt = $pdo->prepare("SELECT arquivo, tipo FROM midias WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    if (!$row) {
        echo json_encode(['success' => false, 'message' => 'Item não encontrado']);
        exit;
    }

    $dir = ($row['tipo'] === 'image') ? UPLOAD_DIR_PHOTOS : UPLOAD_DIR_VIDEOS;
    $filePath = $dir . $row['arquivo'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    $stmt = $pdo->prepare("DELETE FROM midias WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erro ao excluir: ' . $e->getMessage()]);
}
?>