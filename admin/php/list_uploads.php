<?php
// Exibe erros para facilitar a depuração
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Caminho do arquivo JSON
$jsonPath = '../config.json';

// Verifica se o arquivo JSON existe
if (file_exists($jsonPath)) {
    // Lê os dados do JSON
    $jsonData = json_decode(file_get_contents($jsonPath), true);

    // Retorna a lista de uploads como resposta JSON
    echo json_encode($jsonData);
} else {
    // Se o arquivo JSON não existir, retorna uma resposta vazia
    echo json_encode([]);
}
?>
