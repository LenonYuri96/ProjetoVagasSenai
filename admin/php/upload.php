<?php
// Configurações para arquivos grandes
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('upload_max_filesize', '500M');
ini_set('post_max_size', '500M');
ini_set('max_execution_time', 300); // 5 minutos
ini_set('max_input_time', 300); // 5 minutos

$uploadDirImages = '../uploads/photos/';
$uploadDirVideos = '../uploads/videos/';
$jsonPath = '../config.json';

header('Content-Type: application/json');

// Verificar tamanho total do upload
$totalSize = array_sum($_FILES['files']['size']);
if ($totalSize > 500 * 1024 * 1024) {
    echo json_encode([
        'success' => false,
        'message' => 'O tamanho total do upload excede 500MB'
    ]);
    exit;
}

// Criar diretórios se não existirem
if (!is_dir($uploadDirImages)) mkdir($uploadDirImages, 0777, true);
if (!is_dir($uploadDirVideos)) mkdir($uploadDirVideos, 0777, true);

// Verificar e criar arquivo JSON se necessário
if (!file_exists($jsonPath)) {
    file_put_contents($jsonPath, json_encode([]));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_FILES['files'])) {
    $files = $_FILES['files'];
    $response = ['success' => true, 'message' => 'Upload realizado com sucesso!'];
    $newItems = [];

    $jsonData = json_decode(file_get_contents($jsonPath), true) ?: [];
    $nextId = !empty($jsonData) ? max(array_column($jsonData, 'id')) + 1 : 1;

    // Processar cada arquivo
    foreach ($files['name'] as $i => $name) {
        $fileName = time() . '_' . basename($name); // Adiciona timestamp para evitar conflitos
        $fileTmp = $files['tmp_name'][$i];
        $fileType = mime_content_type($fileTmp);
        $fileSize = $files['size'][$i];

        // Determinar tipo e diretório
        if (str_starts_with($fileType, 'image/')) {
            $uploadPath = $uploadDirImages . $fileName;
            $type = 'image';
        } elseif (str_starts_with($fileType, 'video/')) {
            $uploadPath = $uploadDirVideos . $fileName;
            $type = 'video';
        } else {
            $response = [
                'success' => false,
                'message' => 'Tipo de arquivo não suportado: ' . $name
            ];
            echo json_encode($response);
            exit;
        }

        // Mover arquivo
        if (move_uploaded_file($fileTmp, $uploadPath)) {
            $newItems[] = [
                'id' => $nextId++,
                'file' => $fileName,
                'type' => $type,
                'display_time' => ($type === 'image') ? 5 : null,
                'uploaded_at' => date('Y-m-d H:i:s')
            ];
        } else {
            $response = [
                'success' => false,
                'message' => 'Falha ao mover arquivo: ' . $name
            ];
            echo json_encode($response);
            exit;
        }
    }

    // Atualizar arquivo JSON
    if (!empty($newItems)) {
        $updatedData = array_merge($jsonData, $newItems);
        file_put_contents($jsonPath, json_encode($updatedData, JSON_PRETTY_PRINT));
    }

    echo json_encode($response);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Nenhum arquivo recebido'
    ]);
}
