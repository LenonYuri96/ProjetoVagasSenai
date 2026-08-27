<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Tempo de cache em segundos (5 minutos para sempre ter conteúdo novo sem sobrecarregar)
$cacheFile = __DIR__ . '/cache_drops.json';
$cacheTime = 300;

if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
    echo file_get_contents($cacheFile);
    exit;
}

// Feeds RSS reais e fontes com indexação em tempo real (Google News + Portais Oficiais + G1)
$feeds = [
    [
        'url' => 'https://g1.globo.com/mg/triangulo-mineiro/rss2.xml',
        'category' => 'SENAI Uberaba',
        'source' => 'G1 Triângulo Mineiro',
        'type' => 'news'
    ],
    [
        'url' => 'https://news.google.com/rss/search?q="SENAI+Uberaba"+OR+"FIEMG+Uberaba"&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'SENAI Uberaba',
        'source' => 'Notícias Regionais',
        'type' => 'news'
    ],
    [
        'url' => 'https://news.google.com/rss/search?q="FIEMG"+Regional+"Vale+do+Rio+Grande"&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'FIEMG Regional Vale do Rio Grande',
        'source' => 'FIEMG Regional',
        'type' => 'news'
    ],
    [
        'url' => 'https://news.google.com/rss/search?q=site:instagram.com+"senaiuberaba"+OR+"fiemgoficial"&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'FIEMG Oficial',
        'source' => 'Redes Sociais',
        'type' => 'instagram'
    ],
    [
        'url' => 'https://news.google.com/rss/search?q=site:linkedin.com/company/fiemg+OR+"SENAI+MG"&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'LinkedIn FIEMG',
        'source' => 'LinkedIn FIEMG',
        'type' => 'linkedin'
    ],
    [
        'url' => 'https://news.google.com/rss/search?q="SENAI"+capacitacao+OR+curso+OR+industria&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        'category' => 'SENAI Nacional',
        'source' => 'Portal da Indústria',
        'type' => 'news'
    ]
];

$articles = [];
$seenTitles = [];

// Função com timeout curto para buscar os XMLs
function fetchXml($url)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 4);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $data = curl_exec($ch);
    curl_close($ch);
    return $data;
}

foreach ($feeds as $feedConfig) {
    $xmlData = fetchXml($feedConfig['url']);
    if (!$xmlData)
        continue;

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlData, 'SimpleXMLElement', LIBXML_NOCDATA);
    if (!$xml || !isset($xml->channel->item))
        continue;

    foreach ($xml->channel->item as $item) {
        $title = trim((string) $item->title);
        if (empty($title) || strlen($title) < 10)
            continue;

        // Limpa título de sufixos de fontes (ex: "Título - G1")
        $titleClean = preg_replace('/\s*-\s*[^-]+$/', '', $title);

        $normalizedTitle = mb_strtolower($titleClean, 'UTF-8');
        if (isset($seenTitles[$normalizedTitle]))
            continue;
        $seenTitles[$normalizedTitle] = true;

        $description = trim(strip_tags((string) $item->description));
        $link = (string) $item->link;
        $pubDateRaw = (string) $item->pubDate;

        $pubDate = 'Recente';
        if ($pubDateRaw) {
            $timestamp = strtotime($pubDateRaw);
            if ($timestamp) {
                $pubDate = date('d/m/Y', $timestamp);
            }
        }

        // Tenta extrair imagem da tag <enclosure> ou de <img> na descrição
        $image = null;
        if (isset($item->enclosure) && isset($item->enclosure['url'])) {
            $image = (string) $item->enclosure['url'];
        }

        if (!$image && isset($item->description)) {
            if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', (string) $item->description, $match)) {
                $image = $match[1];
            }
        }

        $articles[] = [
            'type' => 'news_drop',
            'title' => $titleClean,
            'summary' => $description ?: 'Confira os detalhes e a matéria completa sobre esta publicação.',
            'image' => $image,
            'video' => null,
            'isVideo' => false,
            'hasVideo' => false,
            'isInstagram' => ($feedConfig['type'] === 'instagram'),
            'isLinkedIn' => ($feedConfig['type'] === 'linkedin'),
            'category' => $feedConfig['category'],
            'pubDate' => $pubDate,
            'source' => $feedConfig['source'],
            'link' => $link
        ];

        if (count($articles) >= 20)
            break;
    }
}

// Salva em cache
$jsonData = json_encode($articles, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
file_put_contents($cacheFile, $jsonData);

echo $jsonData;