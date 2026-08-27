<?php
session_start();
require_once 'auth_check.php';
require_once 'db.php';
require_once 'config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['files'])) {
    echo json_encode(['success' => false, 'message' => 'Nenhum arquivo enviado']);
    exit;
}

$totalSize = array_sum($_FILES['files']['size']);
if ($totalSize > 500 * 1024 * 1024) {
    echo json_encode(['success' => false, 'message' => 'Tamanho total excede 500MB']);
    exit;
}

if (!is_dir(UPLOAD_DIR_PHOTOS)) mkdir(UPLOAD_DIR_PHOTOS, 0777, true);
if (!is_dir(UPLOAD_DIR_VIDEOS)) mkdir(UPLOAD_DIR_VIDEOS, 0777, true);

$pdo = getDB();
$response = ['success' => true, 'message' => 'Upload realizado com sucesso!'];

foreach ($_FILES['files']['name'] as $i => $name) {
    $tmpName = $_FILES['files']['tmp_name'][$i];
    $type = mime_content_type($tmpName);
    $newName = time() . '_' . basename($name);

    if (str_starts_with($type, 'image/')) {
        $dest = UPLOAD_DIR_PHOTOS . $newName;
        $tipo = 'image';
    } elseif (str_starts_with($type, 'video/')) {
        $dest = UPLOAD_DIR_VIDEOS . $newName;
        $tipo = 'video';
    } else {
        echo json_encode(['success' => false, 'message' => "Tipo não suportado: $name"]);
        exit;
    }

    if (!move_uploaded_file($tmpName, $dest)) {
        echo json_encode(['success' => false, 'message' => "Falha ao mover $name"]);
        exit;
    }

    $display_time = ($tipo === 'image') ? 5 : null;
    $stmt = $pdo->prepare("INSERT INTO midias (arquivo, tipo, display_time) VALUES (?, ?, ?)");
    $stmt->execute([$newName, $tipo, $display_time]);
}

echo json_encode($response);
?>