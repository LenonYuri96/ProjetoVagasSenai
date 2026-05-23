<?php
// Exibe erros para facilitar a depuração
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Caminho do arquivo JSON
$jsonPath = '../config.json';

// Lê o JSON existente
$jsonData = json_decode(file_get_contents($jsonPath), true);

// Verifica se a requisição é um POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id']; // Assumindo que o ID é passado no corpo da requisição

    // Procura pelo item com o ID e remove-o
    foreach ($jsonData as $key => $item) {
        if (isset($item['id']) && $item['id'] == $id) {
            unset($jsonData[$key]);
            break;
        }
    }

    // Grava o JSON atualizado
    file_put_contents($jsonPath, json_encode(array_values($jsonData), JSON_PRETTY_PRINT));

    // Retorna resposta JSON
    echo json_encode(['success' => true]);
    exit; // Adiciona isto para evitar saída adicional
} else {
    echo json_encode(['success' => false, 'message' => 'Método inválido']);
    exit;
}
?>
