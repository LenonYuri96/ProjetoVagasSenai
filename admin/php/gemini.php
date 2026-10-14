<?php
/**
 * ============================================================================
 * Serviço Avançado de Integração Google Gemini (AI Studio)
 * Totem SENAI Uberaba & FIEMG Regional Vale do Rio Grande
 * 
 * Funcionalidades:
 * 1. Pílulas Dinâmicas Multi-Drop (action=batch_drops) para alimentar a TV.
 * 2. Pílula Individual com Schema Nativo (action=daily_tip).
 * 3. Desafio Técnico / Quiz Industrial (action=daily_quiz).
 * 4. Memória Anti-Repetição em Disco.
 * 5. Bypass forçado de atualização (&force=1).
 * ============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

// ============================================================================
// 1. CREDENCIAIS E CONFIGURAÇÃO
// ============================================================================
define('GEMINI_API_KEY', '');
define('GEMINI_MODEL', 'gemini-1.5-flash');

/**
 * Chamada cURL única e estruturada ao Google Gemini
 */
function callGeminiStructured($prompt, array $schema, $systemInstruction = '')
{
    if (empty(GEMINI_API_KEY) || strpos(GEMINI_API_KEY, 'SUA_CHAVE') !== false) {
        return null;
    }

    $url = "https://generativelanguage.googleapis.com/v1beta/models/" . GEMINI_MODEL . ":generateContent?key=" . GEMINI_API_KEY;

    $payload = [
        "contents" => [
            [
                "role" => "user",
                "parts" => [["text" => $prompt]]
            ]
        ],
        "generationConfig" => [
            "temperature" => 0.7,
            "maxOutputTokens" => 800,
            "responseMimeType" => "application/json",
            "responseSchema" => $schema
        ]
    ];

    if (!empty($systemInstruction)) {
        $payload["systemInstruction"] = [
            "parts" => [["text" => $systemInstruction]]
        ];
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (is_resource($ch) || (is_object($ch) && PHP_VERSION_ID < 80500)) {
        curl_close($ch);
    }

    if ($httpCode !== 200 || !$response) {
        return null;
    }

    $json = json_decode($response, true);
    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
    return $text ? json_decode($text, true) : null;
}

/**
 * Funções de histórico para evitar repetição de temas
 */
function getRecentTopicsHistory($historyFile)
{
    if (file_exists($historyFile)) {
        $data = json_decode(file_get_contents($historyFile), true);
        if (is_array($data)) {
            return array_slice($data, -8);
        }
    }
    return [];
}

function appendTopicToHistory($historyFile, $topic)
{
    $history = getRecentTopicsHistory($historyFile);
    $history[] = $topic;
    $history = array_slice($history, -8);
    file_put_contents($historyFile, json_encode($history, JSON_UNESCAPED_UNICODE));
}

// Roteamento de parâmetros
$action = $_GET['action'] ?? 'batch_drops';
$force = isset($_GET['force']) && $_GET['force'] == '1';

// Contexto temporal de turno
$horaAtual = (int) date('H');
if ($horaAtual < 12) {
    $turno = "Manhã (aprendizado prático e segurança em oficinas)";
} elseif ($horaAtual < 18) {
    $turno = "Tarde (projetos integradores, automação e laboratórios)";
} else {
    $turno = "Noite (carreira industrial, especialização e competitividade)";
}

$systemBase = "Você é o redator do sistema de sinalização digital da TV do SENAI Uberaba e FIEMG Regional Vale do Rio Grande. "
    . "Seu público são estudantes técnicos de mecatrônica, automação e mecânica, além de docentes e industriais. "
    . "Crie conteúdos com linguagem técnica, moderna e instigante. Evite clichês burocráticos.";

// ============================================================================
// 1. AÇÃO: LOTE DINÂMICO MULTI-DROP (action=batch_drops)
// ============================================================================
if ($action === 'batch_drops') {
    $cacheFile = __DIR__ . '/cache_batch_drops.json';
    $cacheTime = 7200; // 2 horas

    if (!$force && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
        $cached = file_get_contents($cacheFile);
        if (!empty($cached) && $cached !== '[]') {
            echo $cached;
            exit;
        }
    }

    $schema = [
        "type" => "ARRAY",
        "items" => [
            "type" => "OBJECT",
            "properties" => [
                "tag_type" => [
                    "type" => "STRING",
                    "description" => "Ex: DESAFIO TÉCNICO, PROFISSÃO DO FUTURO, INDÚSTRIA 4.0 ou DICA DE OFICINA"
                ],
                "icon" => [
                    "type" => "STRING",
                    "description" => "Um emoji representativo (ex: 🧠, 🚀, 🔮, 💡)"
                ],
                "title" => [
                    "type" => "STRING",
                    "description" => "Título magnético e direto de até 6 palavras"
                ],
                "summary" => [
                    "type" => "STRING",
                    "description" => "Resumo prático ou resposta técnica de até 28 palavras"
                ],
                "category" => [
                    "type" => "STRING",
                    "enum" => ["SENAI UBERABA", "SENAI MG", "FIEMG", "SENAI NACIONAL"]
                ]
            ],
            "required" => ["tag_type", "icon", "title", "summary", "category"]
        ]
    ];

    $prompt = "Gere exatamente 4 cards curtos e diversificados para a TV no turno da {$turno}: "
        . "1. Um DESAFIO TÉCNICO (pergunta rápida com a resposta explicada no resumo); "
        . "2. Uma TENDÊNCIA DE INDÚSTRIA 4.0 aplicada ao chão de fábrica; "
        . "3. Uma PROFISSÃO TÉCNICA EM ALTA na região de Minas Gerais e Triângulo Mineiro; "
        . "4. Uma DICA DE OFICINA sobre segurança NR-12 ou manutenção preditiva IoT. "
        . "Distribua as categorias entre SENAI UBERABA, SENAI MG, FIEMG e SENAI NACIONAL.";

    $result = callGeminiStructured($prompt, $schema, $systemBase);

    if (is_array($result) && count($result) >= 3) {
        $out = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        file_put_contents($cacheFile, $out);
        echo $out;
        exit;
    }

    // Fallback rico para lote
    $fallbacks = [
        [
            "tag_type" => "DESAFIO TÉCNICO",
            "icon" => "🧠",
            "title" => "Qual Dispositivo Protege Contra Sobrecargas?",
            "summary" => "O Relé Térmico. Pelo aquecimento bimetálico, ele desarma o contator antes da queima dos enrolamentos do motor.",
            "category" => "SENAI UBERABA"
        ],
        [
            "tag_type" => "INDÚSTRIA 4.0",
            "icon" => "🔮",
            "title" => "Gêmeos Digitais Reduzem Perdas Fabris",
            "summary" => "Simular esteiras e robôs no computador antes da instalação física reduz paradas de produção em até 30%.",
            "category" => "SENAI MG"
        ],
        [
            "tag_type" => "PROFISSÃO DO FUTURO",
            "icon" => "🚀",
            "title" => "Técnico em Mecatrônica em Alta na Região",
            "summary" => "A modernização industrial no polo de Uberaba impulsiona a procura por especialistas em integração de sistemas automatizados.",
            "category" => "FIEMG"
        ],
        [
            "tag_type" => "DICA DE OFICINA",
            "icon" => "💡",
            "title" => "Manutenção Preditiva com Sensores IoT",
            "summary" => "Medir vibração e temperatura em tempo real detecta folgas em rolamentos semanas antes de uma quebra mecânica.",
            "category" => "SENAI NACIONAL"
        ]
    ];

    $out = json_encode($fallbacks, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    file_put_contents($cacheFile, $out);
    echo $out;
    exit;
}

// ============================================================================
// 2. AÇÃO: PÍLULA INDIVIDUAL RETROCOMPATÍVEL (action=daily_tip)
// ============================================================================
if ($action === 'daily_tip') {
    $cacheFile = __DIR__ . '/cache_daily_tip.json';
    $historyFile = __DIR__ . '/history_daily_tip.json';
    $cacheTime = 21600; // 6 horas

    if (!$force && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
        $cached = file_get_contents($cacheFile);
        if (!empty($cached) && $cached !== '[]') {
            echo $cached;
            exit;
        }
    }

    $topicsPool = [
        "Robótica Industrial Colaborativa",
        "Segurança Operacional e NR-12",
        "Manutenção Preditiva e Sensores IoT",
        "Eficiência Energética em Motores",
        "Gêmeos Digitais e Indústria 4.0",
        "Soldagem Automatizada e Ultrassom",
        "Programação de CLPs Industriais",
        "Inteligência Artificial na Produção"
    ];

    $recent = getRecentTopicsHistory($historyFile);
    $availableTopics = array_values(array_diff($topicsPool, $recent));
    if (empty($availableTopics)) {
        $availableTopics = $topicsPool;
    }
    $chosenTopic = $availableTopics[array_rand($availableTopics)];

    $categories = ["SENAI UBERABA", "SENAI MG", "FIEMG", "SENAI NACIONAL"];
    $chosenCategory = $categories[array_rand($categories)];

    $schema = [
        "type" => "OBJECT",
        "properties" => [
            "title" => [
                "type" => "STRING",
                "description" => "Título direto com até 5 palavras"
            ],
            "summary" => [
                "type" => "STRING",
                "description" => "Explicação técnica objetiva com até 25 palavras"
            ],
            "category" => [
                "type" => "STRING",
                "enum" => $categories
            ]
        ],
        "required" => ["title", "summary", "category"]
    ];

    $prompt = "Gere uma pílula técnica chamativa sobre '{$chosenTopic}' no turno da {$turno}. Categoria: '{$chosenCategory}'.";
    $result = callGeminiStructured($prompt, $schema, $systemBase);

    if ($result && !empty($result['title']) && !empty($result['summary'])) {
        appendTopicToHistory($historyFile, $chosenTopic);
        $finalJson = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        file_put_contents($cacheFile, $finalJson);
        echo $finalJson;
        exit;
    }

    $fallbackSingle = [
        "title" => "Manutenção Preditiva e Sensores IoT",
        "summary" => "Monitorar vibrações em tempo real evita paradas não planejadas e eleva a vida útil dos equipamentos industriais.",
        "category" => "SENAI UBERABA"
    ];
    $out = json_encode($fallbackSingle, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    file_put_contents($cacheFile, $out);
    echo $out;
    exit;
}

// ============================================================================
// 3. AÇÃO: QUIZ / DESAFIO TÉCNICO INTERATIVO (action=daily_quiz)
// ============================================================================
if ($action === 'daily_quiz') {
    $cacheFile = __DIR__ . '/cache_daily_quiz.json';
    $cacheTime = 21600; // 6 horas

    if (!$force && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
        $cached = file_get_contents($cacheFile);
        if (!empty($cached) && $cached !== '[]') {
            echo $cached;
            exit;
        }
    }

    $schema = [
        "type" => "OBJECT",
        "properties" => [
            "question" => ["type" => "STRING", "description" => "Pergunta técnica de múltipla escolha com até 15 palavras"],
            "options" => [
                "type" => "ARRAY",
                "items" => ["type" => "STRING"],
                "description" => "3 opções curtas (A, B, C)"
            ],
            "correct_option" => ["type" => "STRING", "description" => "Opção correta exatamente como listada nas opções"],
            "explanation" => ["type" => "STRING", "description" => "Explicação técnica com até 20 palavras"],
            "category" => [
                "type" => "STRING",
                "enum" => ["SENAI UBERABA", "SENAI MG"]
            ]
        ],
        "required" => ["question", "options", "correct_option", "explanation", "category"]
    ];

    $prompt = "Crie uma pergunta de múltipla escolha técnica de chão de fábrica sobre comandos elétricos, CLP ou pneumática para o turno da {$turno}.";
    $result = callGeminiStructured($prompt, $schema, $systemBase);

    if ($result && !empty($result['question']) && count($result['options'] ?? []) === 3) {
        $finalJson = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        file_put_contents($cacheFile, $finalJson);
        echo $finalJson;
        exit;
    }

    $quizFallback = [
        "question" => "Qual componente desarma o circuito contra sobrecargas contínuas em motores elétricos?",
        "options" => ["Relé Térmico", "Fusível Ultra-Rápido", "Botão Pulsador NA"],
        "correct_option" => "Relé Térmico",
        "explanation" => "O relé térmico atua pelo aquecimento bimetálico, desarmando o contator antes da queima do enrolamento.",
        "category" => "SENAI UBERABA"
    ];
    $out = json_encode($quizFallback, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    file_put_contents($cacheFile, $out);
    echo $out;
    exit;
}

// Status padrão
echo json_encode([
    'status' => 'API Gemini SENAI pronta e operando',
    'model' => GEMINI_MODEL,
    'endpoints' => [
        'batch_drops' => 'gemini.php?action=batch_drops',
        'daily_tip' => 'gemini.php?action=daily_tip',
        'daily_quiz' => 'gemini.php?action=daily_quiz',
        'force' => 'gemini.php?action=batch_drops&force=1'
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);