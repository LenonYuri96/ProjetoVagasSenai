<?php
require_once 'session_config.php'; // ← JÁ INICIA A SESSÃO

require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$senha = $data['senha'] ?? '';

$pdo = getDB();
$stmt = $pdo->query("SELECT id, usuario, senha FROM usuarios LIMIT 1");
$user = $stmt->fetch();

if ($user && password_verify($senha, $user['senha'])) {
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user'] = $user['usuario'];
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Senha incorreta.']);
}
?>