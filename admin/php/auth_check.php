<?php
require_once 'session_config.php';

// Inicia a sessão apenas se ela ainda não estiver ativa
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Garante cabeçalho JSON em caso de resposta
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Não autenticado',
        'session' => $_SESSION
    ]);
    exit;
}
// Se autenticado, o fluxo continua normalmente