/**
 * ============================================================================
 * DropsEngine - Motor de Agregação de Conteúdo e Notícias em Tempo Real
 * SENAI Uberaba & FIEMG Regional Vale do Rio Grande
 *
 * Funcionalidades:
 * 1. Conexão primária com backend PHP de alta performance (get_drops.php).
 * 2. Motor secundário com agregação RSS direta e proxies CORS inteligentes.
 * 3. Filtro semântico contextual (SENAI, FIEMG, Indústria, Inovação, Uberaba).
 * 4. Normalização dinâmica de URLs com suporte a getLocalUrl.
 * 5. Proxy de mídias para evitar bloqueios 403 de CDNs de redes sociais.
 * 6. Distribuição intercalada por categorias para dinamizar a exibição.
 * 7. Fallbacks ricos e resilientes para operação contínua 100% offline.
 * ============================================================================
 */

class DropsEngine {
  constructor() {
    this.cachedDrops = [];
    this.isFetching = false;
    this.lastFetchTime = 0;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos de cache em memória

    // ===== PALAVRAS-CHAVE PARA FILTRAGEM SEMÂNTICA =====
    this.filterKeywords = [
      "fiemg",
      "senai",
      "cni",
      "sesi",
      "iel",
      "industria",
      "industrial",
      "minas gerais",
      "capacitacao",
      "educacao profissional",
      "curso tecnico",
      "tecnologia",
      "inovacao",
      "automacao",
      "robotica",
      "eletromecanica",
      "uberaba",
      "vale do rio grande",
      "triangulo mineiro",
      "competitividade",
      "manufatura",
      "mercado de trabalho",
    ];

    // ===== LISTA NEGRA DE URLS E CONTEÚDOS IRRELEVANTES =====
    this.urlBlacklist = [
      "pessoas.fiemg.com.br",
      "intranet.fiemg.com.br",
      "login",
      "autentica",
      "cadastro",
      "/vagas",
      "/oportunidades",
      "solucoes.fiemg",
      "trabalhe-conosco",
    ];

    this.titleBlacklist = [
      "usuario nao autenticado",
      "intranet",
      "trabalhe conosco",
      "vaga de",
      "auxiliar de",
      "analista de",
      "recrutamento",
      "processo seletivo",
      "home -",
      "login",
      "pagina inicial",
      "erro 404",
    ];

    // ===== CANAIS E FEEDS DIRETOS DE NOTÍCIAS =====
    this.feeds = [
      {
        url: "https://g1.globo.com/mg/triangulo-mineiro/rss2.xml",
        type: "news",
        subtype: "SENAI Uberaba",
        defaultSource: "G1 Triângulo Mineiro",
      },
      {
        url: "https://g1.globo.com/dynamo/economia/rss2.xml",
        type: "news",
        subtype: "G1 Economia",
        defaultSource: "G1 Economia",
      },
      {
        url: 'https://news.google.com/rss/search?q="SENAI+Uberaba"+OR+"FIEMG+Uberaba"&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        type: "news",
        subtype: "SENAI Uberaba",
        defaultSource: "Notícias de Uberaba",
      },
      {
        url: 'https://news.google.com/rss/search?q="FIEMG"+"Vale+do+Rio+Grande"+OR+"FIEMG+Regional"&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        type: "news",
        subtype: "FIEMG Regional Vale do Rio Grande",
        defaultSource: "FIEMG Regional",
      },
      {
        url: 'https://news.google.com/rss/search?q=site:instagram.com+"senaiuberaba"+OR+"fiemgoficial"&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        type: "instagram",
        subtype: "FIEMG Oficial",
        handle: "@fiemgoficial",
        defaultSource: "Instagram Oficial",
      },
      {
        url: 'https://news.google.com/rss/search?q=site:linkedin.com/company/fiemg+OR+"SENAI+Minas+Gerais"&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        type: "linkedin",
        subtype: "LinkedIn FIEMG",
        handle: "fiemg",
        defaultSource: "LinkedIn FIEMG",
      },
      {
        url: "https://news.google.com/rss/search?q=site:portaldaindustria.com.br+SENAI&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        type: "news",
        subtype: "SENAI Nacional",
        defaultSource: "Portal da Indústria",
      },
    ];
  }

  // ===== RESOLUÇÃO DE URLS LOCAIS E ABSOLUTAS =====
  resolveAsset(path) {
    if (!path) return null;
    if (/^(https?:|\/\/|data:)/i.test(path)) {
      return this.proxyMediaUrl(path);
    }
    if (typeof window.getLocalUrl === "function") {
      return window.getLocalUrl(path);
    }
    return `/${path.replace(/^\/+/, "")}`;
  }

  // ===== PROXY ANTI-BLOQUEIO DE MÍDIAS (CORS/HOTLINK) =====
  proxyMediaUrl(url) {
    if (!url) return null;
    if (
      url.includes("cdninstagram.com") ||
      url.includes("fbcdn.net") ||
      url.includes("licdn.com") ||
      url.includes("media.licdn.com")
    ) {
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp&q=80`;
    }
    return url;
  }

  // ===== MÉTODO PRINCIPAL DE CAPTURA E PROCESSAMENTO =====
  async fetchAndProcessDrops() {
    const now = Date.now();
    if (
      this.cachedDrops.length > 0 &&
      now - this.lastFetchTime < this.CACHE_TTL
    ) {
      return this.cachedDrops;
    }

    if (this.isFetching) {
      return this.cachedDrops.length > 0
        ? this.cachedDrops
        : this.getFallbackDrops();
    }

    this.isFetching = true;

    try {
      // 1. Tenta buscar primeiro via endpoint PHP local de alta velocidade
      const dropsFromBackend = await this.fetchFromBackend();
      if (dropsFromBackend && dropsFromBackend.length > 0) {
        this.cachedDrops = this.distributeDrops(dropsFromBackend);
        this.lastFetchTime = Date.now();
        this.isFetching = false;
        return this.cachedDrops;
      }

      // 2. Se o backend não responder, executa a busca direta nos feeds externos
      const dropsFromFeeds = await this.fetchDirectFeeds();
      if (dropsFromFeeds && dropsFromFeeds.length > 0) {
        this.cachedDrops = this.distributeDrops(dropsFromFeeds);
        this.lastFetchTime = Date.now();
        this.isFetching = false;
        return this.cachedDrops;
      }

      throw new Error("Nenhum drop retornado de fontes ativas.");
    } catch (error) {
      console.warn("[DropsEngine] Ativando contingência:", error.message);
      this.isFetching = false;
      this.cachedDrops = this.getFallbackDrops();
      return this.cachedDrops;
    }
  }

  // ===== ESTRATÉGIA 1: BUSCA VIA BACKEND PHP =====
  async fetchFromBackend() {
    try {
      const endpoint = this.resolveAsset("admin/php/get_drops.php");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const rawData = await response.json();
      if (Array.isArray(rawData) && rawData.length > 0) {
        return rawData.map((item) => ({
          type: "news_drop",
          title: item.title,
          summary: item.summary,
          image: item.image ? this.resolveAsset(item.image) : null,
          video: item.video ? this.resolveAsset(item.video) : null,
          isVideo: !!item.video,
          hasVideo: !!item.video,
          isInstagram: !!item.isInstagram,
          isLinkedIn: !!item.isLinkedIn,
          category: item.category || "SENAI Uberaba",
          pubDate: item.pubDate || "Hoje",
          source: item.source || "SENAI Notícias",
          link: item.link || "#",
        }));
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  // ===== ESTRATÉGIA 2: BUSCA DIRETA EM FEEDS RSS (CLIENT-SIDE) =====
  async fetchDirectFeeds() {
    let allRawItems = [];

    const fetchPromises = this.feeds.map(async (feedConfig) => {
      try {
        const converterUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedConfig.url)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(converterUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.status === "ok" && data.items && data.items.length > 0) {
            return data.items.map((item) => ({
              ...item,
              feedMetadata: feedConfig,
            }));
          }
        }
        return [];
      } catch (e) {
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    results.forEach((items) => {
      if (items && Array.isArray(items)) {
        allRawItems = allRawItems.concat(items);
      }
    });

    return this.applySemanticFilter(allRawItems);
  }

  // ===== FILTRAGEM, HIGIENIZAÇÃO E CATEGORIZAÇÃO =====
  applySemanticFilter(items) {
    const normalize = (str) =>
      str
        ? str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
        : "";

    const decodeEntities = (str) => {
      if (!str) return "";
      return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    };

    const seenTitles = new Set();
    const validDrops = [];

    items.forEach((item) => {
      const metadata = item.feedMetadata || {};
      const isInstagram = metadata.type === "instagram";
      const isLinkedIn = metadata.type === "linkedin";

      let titleClean = item.title ? decodeEntities(item.title.trim()) : "";
      const itemLink = item.link || "";

      // Limpa sufixos de jornais nos títulos
      titleClean = titleClean.replace(/\s*-\s*[^-\n]+$/, "").trim();

      // Validação contra listas negras
      if (!isInstagram && !isLinkedIn) {
        if (
          this.urlBlacklist.some((bad) => itemLink.toLowerCase().includes(bad))
        )
          return;
        if (
          this.titleBlacklist.some((bad) =>
            titleClean.toLowerCase().includes(bad),
          )
        )
          return;
        if (titleClean.length < 12) return;
      }

      const textToAnalyze = normalize(
        titleClean +
          " " +
          (item.description || "") +
          " " +
          (item.content || ""),
      );

      const isRelevant =
        isInstagram ||
        isLinkedIn ||
        this.filterKeywords.some((kw) => textToAnalyze.includes(kw));

      if (!isRelevant) return;

      // Deduplicação
      const titleHash = normalize(titleClean.substring(0, 40));
      if (seenTitles.has(titleHash)) return;
      seenTitles.add(titleHash);

      // Definição de Categoria e Fonte
      let category = metadata.subtype || "Geral";
      let source = metadata.defaultSource || item.author || "SENAI";

      if (isInstagram) {
        category = metadata.subtype || "FIEMG Oficial";
        source = metadata.handle ? `Instagram ${metadata.handle}` : "Instagram";
      } else if (isLinkedIn) {
        category = "LinkedIn FIEMG";
        source = "LinkedIn FIEMG";
      } else {
        const hasUberaba =
          textToAnalyze.includes("uberaba") ||
          textToAnalyze.includes("vale do rio grande");
        const hasSenai = textToAnalyze.includes("senai");
        const hasFiemg = textToAnalyze.includes("fiemg");

        if (hasUberaba) {
          if (hasSenai) {
            category = "SENAI Uberaba";
            source = "SENAI Regional";
          } else if (hasFiemg) {
            category = "FIEMG Regional Vale do Rio Grande";
            source = "FIEMG Regional";
          }
        } else if (hasSenai || itemLink.includes("portaldaindustria.com.br")) {
          category = "SENAI Nacional";
          source = "Portal da Indústria";
        } else if (hasFiemg || itemLink.includes("fiemg.com.br")) {
          category = "FIEMG Oficial";
          source = "Portal FIEMG";
        }
      }

      // Extração de Imagens
      let rawImage = null;
      if (
        item.enclosure &&
        item.enclosure.link &&
        !item.enclosure.link.includes("pixel")
      ) {
        rawImage = item.enclosure.link;
      } else if (item.thumbnail && !item.thumbnail.includes("pixel")) {
        rawImage = item.thumbnail;
      } else if (item.image) {
        rawImage = item.image;
      }

      if (!rawImage && (item.description || item.content)) {
        const imgMatch = (item.description || item.content).match(
          /<img[^>]+src=["']([^"']+)["']/i,
        );
        if (imgMatch && !imgMatch[1].includes("pixel")) {
          rawImage = imgMatch[1];
        }
      }

      // Higienização do Resumo
      let cleanSummary = decodeEntities(item.description || "")
        .replace(/<[^>]*>/g, "")
        .replace(/#\w+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!cleanSummary || cleanSummary.length < 15) {
        cleanSummary =
          "Acompanhe as principais atualizações, projetos e novidades no ecossistema da indústria mineira.";
      } else if (cleanSummary.length > 220) {
        cleanSummary = cleanSummary.substring(0, 217) + "...";
      }

      // Formatação de data
      let formattedDate = "Hoje";
      if (item.pubDate) {
        try {
          const d = new Date(item.pubDate);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });
          }
        } catch (e) {}
      }

      validDrops.push({
        type: "news_drop",
        title: titleClean,
        summary: cleanSummary,
        image: rawImage ? this.resolveAsset(rawImage) : null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: isInstagram,
        isLinkedIn: isLinkedIn,
        category: category,
        pubDate: formattedDate,
        source: source,
        link: itemLink || "#",
      });
    });

    return validDrops;
  }

  // ===== DISTRIBUIÇÃO INTERCALADA (ROUND-ROBIN) =====
  distributeDrops(items) {
    if (!items || items.length === 0) return this.getFallbackDrops();

    const buckets = {
      "SENAI Uberaba": [],
      "FIEMG Regional Vale do Rio Grande": [],
      "LinkedIn FIEMG": [],
      "FIEMG Oficial": [],
      "SENAI Nacional": [],
      Geral: [],
    };

    items.forEach((item) => {
      const cat = item.category || "Geral";
      if (buckets[cat]) {
        buckets[cat].push(item);
      } else {
        buckets["Geral"].push(item);
      }
    });

    const ordered = [];
    const maxLen = Math.max(...Object.values(buckets).map((b) => b.length), 0);

    for (let i = 0; i < maxLen; i++) {
      for (const cat in buckets) {
        if (buckets[cat] && buckets[cat][i]) {
          ordered.push(buckets[cat][i]);
        }
      }
    }

    return ordered.slice(0, 16);
  }

  // ===== BASE DE CONTINGÊNCIA RESILIENTE (100% OFFLINE) =====
  getFallbackDrops() {
    const today = new Date().toLocaleDateString("pt-BR");
    return [
      {
        type: "news_drop",
        title:
          "Cursos Técnicos Presenciais no SENAI Uberaba com Foco Industrial",
        summary:
          "Inscrições abertas para formações práticas em Automação Industrial, Mecatrônica e Eletrotécnica no campus Uberaba.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: false,
        isLinkedIn: false,
        category: "SENAI Uberaba",
        pubDate: today,
        source: "SENAI Regional",
        link: "https://www.senaimg.com.br",
      },
      {
        type: "news_drop",
        title: "FIEMG Regional Vale do Rio Grande Impulsiona Novos Negócios",
        summary:
          "Encontros de competitividade e desenvolvimento de fornecedores fortalecem o polo industrial do Triângulo Mineiro.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: false,
        isLinkedIn: true,
        category: "LinkedIn FIEMG",
        pubDate: today,
        source: "LinkedIn FIEMG",
        link: "https://www.linkedin.com/company/fiemg/",
      },
      {
        type: "news_drop",
        title: "Inovação e Tecnologia: Indústria 4.0 no Ecossistema Mineiro",
        summary:
          "SENAI e FIEMG promovem a modernização das fábricas com consultorias em inteligência artificial e manufatura enxuta.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: true,
        isLinkedIn: false,
        category: "FIEMG Oficial",
        pubDate: today,
        source: "Instagram @fiemgoficial",
        link: "https://www.instagram.com/fiemgoficial/",
      },
      {
        type: "news_drop",
        title: "Qualificação Profissional Gratuita para a Indústria Regional",
        summary:
          "Programas de capacitação técnica abrem oportunidades para jovens e profissionais que buscam especialização.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: false,
        isLinkedIn: false,
        category: "SENAI Nacional",
        pubDate: today,
        source: "Portal da Indústria",
        link: "https://www.portaldaindustria.com.br",
      },
    ];
  }
}

// Instância Global Única
window.DropsEngineInstance = new DropsEngine();
