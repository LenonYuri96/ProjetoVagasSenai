<?php
/**
 * ============================================================================
 * Serviço de Integração com Google Gemini (AI Studio)
 * Totem SENAI Uberaba & FIEMG Regional Vale do Rio Grande
 * 
 * Funcionalidades:
 * 1. Geração de Pílulas de Conhecimento e Dicas Rápidas para a TV.
 * 2. Saída JSON estruturada (application/json) nativa.
 * 3. Enquadramento restrito nas 4 categorias oficiais:
 *    - SENAI UBERABA | SENAI MG | FIEMG | SENAI NACIONAL
 * 4. Cache local de 12 horas em disco com bypass forçado (&force=1).
 * ============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

// ============================================================================
// 1. CREDENCIAIS E CONFIGURAÇÃO DO MODELO
// ============================================================================
// Cole sua chave obtida no Google AI Studio (aistudio.google.com)
define('GEMINI_API_KEY', 'SUA_CHAVE_DO_GOOGLE_AI_STUDIO_AQUI');

// Modelo recomendado para resposta rápida e gratuita
define('GEMINI_MODEL', 'gemini-1.5-flash');

/**
 * Função executora da chamada cURL para a API do Google Gemini
 */
function callGemini($prompt)
{
    // Validação preventiva de chave não configurada
    if (GEMINI_API_KEY === 'SUA_CHAVE_DO_GOOGLE_AI_STUDIO_AQUI' || empty(GEMINI_API_KEY)) {
        return null;
    }

    $url = "https://generativelanguage.googleapis.com/v1beta/models/" . GEMINI_MODEL . ":generateContent?key=" . GEMINI_API_KEY;

    // Configuração do payload com garantia de retorno JSON puro (responseMimeType)
    $payload = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $prompt]
                ]
            ]
        ],
        "generationConfig" => [
            "temperature" => 0.7,
            "maxOutputTokens" => 250,
            "responseMimeType" => "application/json"
        ]
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_TIMEOUT, 7);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    // Compatibilidade com PHP 8.0 até PHP 8.5+
    if (is_resource($ch) || (is_object($ch) && PHP_VERSION_ID < 80500)) {
        curl_close($ch);
    }

    if ($httpCode !== 200 || !$response) {
        return null;
    }

    $json = json_decode($response, true);
    return $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
}

$action = $_GET['action'] ?? '';
$force = isset($_GET['force']) && $_GET['force'] == '1';

// ============================================================================
// 2. AÇÃO: GERAR DICA DO DIA / PÍLULA INDUSTRIAL
// ============================================================================
if ($action === 'daily_tip') {
    $cacheFile = __DIR__ . '/cache_daily_tip.json';
    $cacheTime = 43200; // 12 horas de cache em disco

    // Se NÃO for solicitação forçada pelo botão do admin e o cache existir, entrega o cache
    if (!$force && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
        $cached = file_get_contents($cacheFile);
        if (!empty($cached) && $cached !== '[]') {
            echo $cached;
            exit;
        }
    }

    // Temas técnicos alinhados ao ecossistema do SENAI e Indústria
    $topics = [
        "Automação e Robótica Industrial",
        "Segurança do Trabalho e NR-12",
        "Manutenção Preditiva e Sensores IoT",
        "Eficiência Energética nas Linhas de Produção",
        "Gêmeos Digitais e Indústria 4.0",
        "Soldagem Avançada e Inspeção Visual",
        "Mecatrônica e Manufatura Aditiva 3D",
        "Inteligência Artificial Aplicada ao Chão de Fábrica"
    ];
    $randomTopic = $topics[array_rand($topics)];

    // Sorteia uma das 4 categorias oficiais para equilibrar a esteira da TV
    $allowedCategories = ["SENAI UBERABA", "SENAI MG", "FIEMG", "SENAI NACIONAL"];
    $targetCategory = $allowedCategories[array_rand($allowedCategories)];

    // Prompt estrito com esquema JSON explícito
    $prompt = "Você é o sistema inteligente de comunicação interna do SENAI Uberaba (Minas Gerais). "
        . "Gere uma pílula informativa curta e chamativa sobre o tema: '{$randomTopic}'. "
        . "Esta dica será exibida por 10 segundos na TV do saguão para alunos, professores e empresários. "
        . "Retorne estritamente um JSON no seguinte formato: "
        . "{"
        . "\"title\": \"Título curto e impactante (máximo 5 palavras)\", "
        . "\"summary\": \"Explicação prática em 1 ou 2 frases curtas (máximo 25 palavras).\", "
        . "\"category\": \"{$targetCategory}\""
        . "}";

    $result = callGemini($prompt);

    if ($result) {
        // Remove eventuais quebras ou marcações markdown residuais
        $cleaned = preg_replace('/```(?:json)?/i', '', $result);
        $cleaned = trim($cleaned);

        $parsed = json_decode($cleaned, true);
        if ($parsed && isset($parsed['title']) && isset($parsed['summary'])) {
            // Garante que a categoria seja estritamente uma das 4 oficiais
            if (!in_array($parsed['category'] ?? '', $allowedCategories, true)) {
                $parsed['category'] = $targetCategory;
            }

            $finalJson = json_encode($parsed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            file_put_contents($cacheFile, $finalJson);
            echo $finalJson;
            exit;
        }
    }

    // ========================================================================
    // 3. BASE DE CONTINGÊNCIA (OFFLINE OU SE A CHAVE DO GEMINI ESTIVER VAZIA)
    // ========================================================================
    $fallbacks = [
        [
            "title" => "Manutenção Preditiva com Sensores IoT",
            "summary" => "Monitorar temperatura e vibração em tempo real evita paradas não planejadas e aumenta a vida útil dos equipamentos.",
            "category" => "SENAI UBERABA"
        ],
        [
            "title" => "Segurança Fabril e Normas NR-12",
            "summary" => "A proteção física de máquinas e a capacitação contínua são os pilares essenciais para o índice zero de acidentes.",
            "category" => "SENAI MG"
        ],
        [
            "title" => "Eficiência e Gestão Energética",
            "summary" => "Controlar horários de pico e otimizar compressores industriais gera economia de até 20% no consumo das fábricas.",
            "category" => "FIEMG"
        ],
        [
            "title" => "Gêmeos Digitais na Manufatura 4.0",
            "summary" => "Testar simulações 3D da produção antes da montagem real reduz desperdícios e acelera novos lançamentos industriais.",
            "category" => "SENAI NACIONAL"
        ]
    ];

    $chosenFallback = $fallbacks[array_rand($fallbacks)];
    $fallbackJson = json_encode($chosenFallback, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // Salva em cache para não reprocessar repetidamente em falha
    file_put_contents($cacheFile, $fallbackJson);

    echo $fallbackJson;
    exit;
}

// Resposta padrão de verificação de status
echo json_encode([
    'status' => 'API Gemini SENAI pronta',
    'model' => GEMINI_MODEL,
    'categories' => ['SENAI UBERABA', 'SENAI MG', 'FIEMG', 'SENAI NACIONAL']
], JSON_UNESCAPED_UNICODE);