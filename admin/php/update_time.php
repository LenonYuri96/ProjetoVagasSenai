<?php
// Exibe erros para facilitar a depuração
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Caminho do arquivo JSON
$jsonPath = '../config.json';

// Lê o JSON existente
$jsonData = json_decode(file_get_contents($jsonPath), true);
$data = json_decode(file_get_contents('php://input'), true);
$id = $data['id'];
$display_time = (int)$data['display_time']; // Converte para inteiro, se necessário

// Atualiza o tempo de exibição
foreach ($jsonData as &$item) {
    if ($item['id'] == $id) {
        // Atualiza o tempo de exibição para o valor recebido
        $item['display_time'] = $display_time; // Corrige para usar 'display_time'
        break; // Sai do loop após encontrar o item
    }
}

// Grava o JSON atualizado
file_put_contents($jsonPath, json_encode($jsonData, JSON_PRETTY_PRINT));

// Retorna resposta JSON
echo json_encode(['success' => true]);
exit; // Adiciona isto para evitar saída adicional
?>
