<?php
/**
 * ============================================================================
 * Backend de Captura, Filtragem e Cache de Notícias (Drops)
 * SENAI Uberaba & FIEMG Regional Vale do Rio Grande
 * 
 * Funcionalidades:
 * 1. Enquadramento estrito nas 4 categorias oficiais:
 *    - SENAI UBERABA
 *    - SENAI MG
 *    - FIEMG
 *    - SENAI NACIONAL
 * 2. Bloqueio rigoroso de temas políticos, partidários e eleições.
 * 3. Janela temporal de corte: Notícias com mais de 60 dias são descartadas.
 * 4. Filtro de relevância para descartar notícias policiais de feeds abertos.
 * 5. Cache resiliente em disco para não sobrecarregar servidores nem apagar em falhas.
 * ============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

// ============================================================================
// 1. CONFIGURAÇÕES DE CACHE E CONSTANTES TEMPORAIS
// ============================================================================
$cacheFile = __DIR__ . '/cache_drops.json';
$cacheTime = 300; // 5 minutos de cache em disco

// Se o cache for válido e contiver conteúdo, entrega imediatamente
if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
    $cachedContent = file_get_contents($cacheFile);
    if (!empty($cachedContent) && $cachedContent !== '[]') {
        echo $cachedContent;
        exit;
    }
}

// Limite estrito de idade: 60 dias em segundos (60 dias * 24h * 60m * 60s)
define('MAX_NEWS_AGE_SECONDS', 5184000);

// ============================================================================
// 2. LISTA NEGRA: POLÍTICA, ELEIÇÕES E PARTIDOS
// ============================================================================
$politicalBlacklist = [
    'eleicao',
    'eleicoes',
    'eleitoral',
    'eleitorais',
    'candidato',
    'candidata',
    'candidatos',
    'candidatas',
    'candidatura',
    'campanha eleitoral',
    'propaganda eleitoral',
    'pesquisa eleitoral',
    'urna eletronica',
    'urna',
    'tse',
    'tre-mg',
    'comicio',
    'partido politico',
    'partidario',
    'partidaria',
    'reeleicao',
    'deputado',
    'deputada',
    'deputados',
    'senador',
    'senadora',
    'senadores',
    'vereador',
    'vereadores',
    'prefeito',
    'prefeita',
    'prefeitos',
    'coligacao',
    'planalto',
    'congresso nacional',
    'camara dos deputados',
    'senado federal',
    'stf',
    'cpi',
    'polarizacao',
    'governador',
    'governadora',
    'cassacao',
    'parlamentar',
    'bancada',
    'pleito',
    'voto nulo',
    'voto branco',
    'santinho'
];

// ============================================================================
// 3. PALAVRAS-CHAVE DE RELEVÂNCIA (INDÚSTRIA, CURSOS E TECNOLOGIA)
// ============================================================================
$relevanceKeywords = [
    'senai',
    'fiemg',
    'sesi',
    'iel',
    'cni',
    'industria',
    'industrial',
    'capacitacao',
    'educacao profissional',
    'curso',
    'tecnico',
    'tecnologia',
    'inovacao',
    'automacao',
    'robotica',
    'mecanica',
    'eletromecanica',
    'eletrotecnica',
    'soldagem',
    'usinagem',
    'manufatura',
    'mercado de trabalho',
    'vagas',
    'estagio',
    'aprendiz',
    'competitividade',
    'inteligencia artificial',
    'engenharia'
];

// ============================================================================
// 4. MAPEAMENTO DE FEEDS OFICIAIS
// ============================================================================
$feeds = [
    // 1. SENAI UBERABA
    [
        'url' => 'https://news.google.com/rss/search?q=("SENAI+Uberaba")+when:60d+-eleicao+-politica+-candidato&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'SENAI UBERABA',
        'source' => 'SENAI Uberaba',
        'type' => 'news'
    ],
    [
        'url' => 'https://g1.globo.com/mg/triangulo-mineiro/rss2.xml',
        'category' => 'SENAI UBERABA',
        'source' => 'G1 Triângulo',
        'type' => 'news'
    ],
    // 2. FIEMG
    [
        'url' => 'https://news.google.com/rss/search?q=("FIEMG"+OR+"FIEMG+Regional"+"Vale+do+Rio+Grande")+when:60d+-eleicao+-politica+-candidato&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'FIEMG',
        'source' => 'FIEMG Regional',
        'type' => 'news'
    ],
    [
        'url' => 'https://news.google.com/rss/search?q=site:instagram.com+("senaiuberaba"+OR+"fiemgoficial")+when:60d+-eleicao+-politica&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'FIEMG',
        'source' => 'Instagram Oficial',
        'type' => 'instagram'
    ],
    // 3. SENAI MG
    [
        'url' => 'https://news.google.com/rss/search?q=("SENAI+Minas+Gerais"+OR+"SENAI+MG")+capacitacao+when:60d+-eleicao+-politica&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'SENAI MG',
        'source' => 'SENAI Minas Gerais',
        'type' => 'news'
    ],
    [
        'url' => 'https://news.google.com/rss/search?q=site:linkedin.com/company/fiemg+when:60d+-eleicao+-politica&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'SENAI MG',
        'source' => 'LinkedIn FIEMG/SENAI',
        'type' => 'linkedin'
    ],
    // 4. SENAI NACIONAL
    [
        'url' => 'https://news.google.com/rss/search?q=("SENAI+Nacional"+OR+site:portaldaindustria.com.br+SENAI)+when:60d+-eleicao+-politica&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'SENAI NACIONAL',
        'source' => 'Portal da Indústria',
        'type' => 'news'
    ]
];

$articles = [];
$seenTitles = [];

// ============================================================================
// 5. FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Remove acentos de forma nativa e segura sem dependências externas
 */
function sanitizeAccents($string)
{
    $table = [
        'á' => 'a',
        'à' => 'a',
        'ã' => 'a',
        'â' => 'a',
        'ä' => 'a',
        'é' => 'e',
        'è' => 'e',
        'ê' => 'e',
        'ë' => 'e',
        'í' => 'i',
        'ì' => 'i',
        'î' => 'i',
        'ï' => 'i',
        'ó' => 'o',
        'ò' => 'o',
        'õ' => 'o',
        'ô' => 'o',
        'ö' => 'o',
        'ú' => 'u',
        'ù' => 'u',
        'û' => 'u',
        'ü' => 'u',
        'ç' => 'c',
        'ñ' => 'n',
        'Á' => 'a',
        'À' => 'a',
        'Ã' => 'a',
        'Â' => 'a',
        'Ä' => 'a',
        'É' => 'e',
        'È' => 'e',
        'Ê' => 'e',
        'Ë' => 'e',
        'Í' => 'i',
        'Ì' => 'i',
        'Î' => 'i',
        'Ï' => 'i',
        'Ó' => 'o',
        'Ò' => 'o',
        'Õ' => 'o',
        'Ô' => 'o',
        'Ö' => 'o',
        'Ú' => 'u',
        'Ù' => 'u',
        'Û' => 'u',
        'Ü' => 'u',
        'Ç' => 'c',
        'Ñ' => 'n'
    ];
    return strtr($string, $table);
}

/**
 * Executa requisição cURL com timeout curto e descompressão gzip automática
 */
function fetchXmlFeed($url)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $data = curl_exec($ch);

    // Suporte compatível para PHP 8.0 até PHP 8.5+
    if (is_resource($ch) || (is_object($ch) && PHP_VERSION_ID < 80500)) {
        curl_close($ch);
    }

    return $data;
}

$now = time();

// ============================================================================
// 6. LOOP DE PROCESSAMENTO E FILTRAGEM
// ============================================================================
foreach ($feeds as $feedConfig) {
    $xmlData = fetchXmlFeed($feedConfig['url']);
    if (!$xmlData) {
        continue;
    }

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlData, 'SimpleXMLElement', LIBXML_NOCDATA);
    if (!$xml || !isset($xml->channel->item)) {
        continue;
    }

    $feedCount = 0;

    foreach ($xml->channel->item as $item) {
        $title = trim((string) $item->title);
        if (empty($title) || mb_strlen($title, 'UTF-8') < 10) {
            continue;
        }

        // 1. FILTRO DE IDADE (MÁXIMO 60 DIAS)
        $pubDateRaw = (string) $item->pubDate;
        $pubDate = 'Recente';

        if (!empty($pubDateRaw)) {
            $timestamp = strtotime($pubDateRaw);
            if ($timestamp) {
                $ageInSeconds = $now - $timestamp;
                if ($ageInSeconds > MAX_NEWS_AGE_SECONDS || $ageInSeconds < -86400) {
                    continue; // Pula notícia que ultrapassou 60 dias
                }
                $pubDate = date('d/m/Y', $timestamp);
            }
        }

        $description = trim(strip_tags((string) $item->description));
        $normalizedText = mb_strtolower(sanitizeAccents($title . ' ' . $description), 'UTF-8');

        // 2. BLOQUEIO DE POLÍTICA E ELEIÇÕES
        $isPolitical = false;
        foreach ($politicalBlacklist as $badWord) {
            if (strpos($normalizedText, $badWord) !== false) {
                $isPolitical = true;
                break;
            }
        }
        if ($isPolitical) {
            continue; // Pula conteúdo político
        }

        // 3. FILTRO DE RELEVÂNCIA (PARA FEEDS GENÉRICOS COMO G1)
        $isRelevant = false;
        foreach ($relevanceKeywords as $goodWord) {
            if (strpos($normalizedText, $goodWord) !== false) {
                $isRelevant = true;
                break;
            }
        }
        if (!$isRelevant && strpos($feedConfig['url'], 'g1.globo.com') !== false) {
            continue; // Pula matérias sem relação com indústria/cursos
        }

        // Limpeza de sufixos de jornais (ex: "Título - G1")
        $titleClean = html_entity_decode(preg_replace('/\s*[-|]\s*[^-|]+$/', '', $title), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $normalizedTitle = mb_strtolower(sanitizeAccents($titleClean), 'UTF-8');

        // Deduplicação por título
        if (isset($seenTitles[$normalizedTitle])) {
            continue;
        }
        $seenTitles[$normalizedTitle] = true;

        // 4. CLASSIFICAÇÃO NAS 4 CATEGORIAS OFICIAIS
        $category = $feedConfig['category'];
        if (strpos($normalizedText, 'uberaba') !== false) {
            $category = 'SENAI UBERABA';
        } elseif (strpos($normalizedText, 'fiemg') !== false) {
            $category = 'FIEMG';
        } elseif (strpos($normalizedText, 'minas gerais') !== false || strpos($normalizedText, 'senai mg') !== false) {
            $category = 'SENAI MG';
        } elseif (strpos($normalizedText, 'senai') !== false || strpos($normalizedText, 'cni') !== false) {
            $category = 'SENAI NACIONAL';
        }

        // 5. TRATAMENTO SEGURO DE IMAGENS
        $image = null;
        if (isset($item->enclosure) && isset($item->enclosure['url'])) {
            $image = (string) $item->enclosure['url'];
        }
        if (!$image && isset($item->description)) {
            // Regex delimitada com til para evitar quebra de aspas
            if (preg_match('~<img[^>]+src=[\'"]([^\'"]+)[\'"]~i', (string) $item->description, $match)) {
                $image = $match[1];
            }
        }

        // Higienização de resumo
        $cleanSummary = html_entity_decode($description, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if (empty($cleanSummary) || mb_strlen($cleanSummary, 'UTF-8') < 15) {
            $cleanSummary = 'Confira as atualizações e projetos no ecossistema da indústria mineira e nacional.';
        } elseif (mb_strlen($cleanSummary, 'UTF-8') > 220) {
            $cleanSummary = mb_substr($cleanSummary, 0, 217, 'UTF-8') . '...';
        }

        $articles[] = [
            'type' => 'news_drop',
            'title' => $titleClean,
            'summary' => $cleanSummary,
            'image' => $image,
            'video' => null,
            'isVideo' => false,
            'hasVideo' => false,
            'isInstagram' => ($feedConfig['type'] === 'instagram'),
            'isLinkedIn' => ($feedConfig['type'] === 'linkedin'),
            'category' => $category,
            'pubDate' => $pubDate,
            'source' => $feedConfig['source'],
            'link' => (string) $item->link
        ];

        $feedCount++;
        if ($feedCount >= 5) {
            break;
        }
    }
}

// ============================================================================
// 7. CONTINGÊNCIA RESILIENTE (SE A INTERNET OU FEEDS FALHAREM)
// ============================================================================
if (empty($articles)) {
    if (file_exists($cacheFile)) {
        $staleCache = file_get_contents($cacheFile);
        if (!empty($staleCache) && $staleCache !== '[]') {
            echo $staleCache;
            exit;
        }
    }

    $today = date('d/m/Y');
    $articles = [
        [
            'type' => 'news_drop',
            'title' => 'Cursos Técnicos e Qualificação Profissional no SENAI Uberaba',
            'summary' => 'Formações práticas em Automação Industrial, Mecatrônica e Eletrotécnica com foco nas demandas regionais.',
            'image' => null,
            'video' => null,
            'isVideo' => false,
            'hasVideo' => false,
            'isInstagram' => false,
            'isLinkedIn' => false,
            'category' => 'SENAI UBERABA',
            'pubDate' => $today,
            'source' => 'SENAI Regional',
            'link' => 'https://www.senaimg.com.br'
        ],
        [
            'type' => 'news_drop',
            'title' => 'Capacitação Profissional SENAI Impulsiona a Indústria em Minas Gerais',
            'summary' => 'Programas de desenvolvimento e especialização técnica abrem novas frentes de competitividade no estado.',
            'image' => null,
            'video' => null,
            'isVideo' => false,
            'hasVideo' => false,
            'isInstagram' => false,
            'isLinkedIn' => false,
            'category' => 'SENAI MG',
            'pubDate' => $today,
            'source' => 'SENAI Minas Gerais',
            'link' => 'https://www.senaimg.com.br'
        ],
        [
            'type' => 'news_drop',
            'title' => 'FIEMG Regional Vale do Rio Grande Fortalece Negócios da Região',
            'summary' => 'Iniciativas industriais e rodadas de negócios apoiam o crescimento econômico no Triângulo Mineiro.',
            'image' => null,
            'video' => null,
            'isVideo' => false,
            'hasVideo' => false,
            'isInstagram' => false,
            'isLinkedIn' => true,
            'category' => 'FIEMG',
            'pubDate' => $today,
            'source' => 'FIEMG Oficial',
            'link' => 'https://www.fiemg.com.br'
        ],
        [
            'type' => 'news_drop',
            'title' => 'Inovação Tecnológica e Manufatura Avançada na Indústria Brasileira',
            'summary' => 'O SENAI Nacional atua na modernização das fábricas através de consultorias em Indústria 4.0 e automação.',
            'image' => null,
            'video' => null,
            'isVideo' => false,
            'hasVideo' => false,
            'isInstagram' => false,
            'isLinkedIn' => false,
            'category' => 'SENAI NACIONAL',
            'pubDate' => $today,
            'source' => 'Portal da Indústria',
            'link' => 'https://www.portaldaindustria.com.br'
        ]
    ];
}

// ============================================================================
// 8. SALVAMENTO EM CACHE E SAÍDA JSON
// ============================================================================
$jsonData = json_encode($articles, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
file_put_contents($cacheFile, $jsonData);

echo $jsonData;