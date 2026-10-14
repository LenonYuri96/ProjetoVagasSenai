/**
 * ============================================================================
 * DropsEngine - Motor Unificado de Conteúdo, Notícias & IA Ativa
 * SENAI Uberaba & FIEMG Regional Vale do Rio Grande
 * ============================================================================
 */

class DropsEngine {
  constructor() {
    this.cachedDrops = [];
    this.cachedAiDrops = [];
    this.lastAiFetchTime = 0;
    this.isFetching = false;
    this.lastFetchTime = 0;

    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos de cache para notícias
    this.AI_CACHE_TTL = 30 * 60 * 1000; // 30 minutos de cache para IA
    this.REQUEST_TIMEOUT_BACKEND = 5000;
    this.REQUEST_TIMEOUT_EXTERNAL = 3500;

    this.MAX_NEWS_AGE_MS = 60 * 24 * 60 * 60 * 1000;

    this.CATEGORIES = Object.freeze({
      UBERABA: "SENAI UBERABA",
      MG: "SENAI MG",
      FIEMG: "FIEMG",
      NACIONAL: "SENAI NACIONAL",
    });

    this.politicalBlacklist = [
      "eleicao",
      "eleicoes",
      "eleitoral",
      "eleitorais",
      "candidato",
      "candidata",
      "candidatos",
      "candidatas",
      "candidatura",
      "candidaturas",
      "campanha eleitoral",
      "propaganda eleitoral",
      "pesquisa eleitoral",
      "urna eletronica",
      "urna",
      "urnas",
      "tse",
      "tre-mg",
      "tribunal superior eleitoral",
      "comicio",
      "comicios",
      "partido politico",
      "partidos politicos",
      "partidario",
      "partidaria",
      "partidarios",
      "reeleicao",
      "reeleito",
      "reeleita",
      "deputado",
      "deputada",
      "deputados",
      "deputadas",
      "deputado estadual",
      "deputado federal",
      "senador",
      "senadora",
      "senadores",
      "senado federal",
      "vereador",
      "vereadores",
      "vereador municipal",
      "prefeito",
      "prefeita",
      "prefeitos",
      "prefeitas",
      "coligacao",
      "coligacoes",
      "planalto",
      "palacio do planalto",
      "congresso nacional",
      "camara dos deputados",
      "stf",
      "supremo tribunal federal",
      "cpi",
      "polarizacao",
      "governador",
      "governadora",
      "governadores",
      "cassacao",
      "cassado",
      "cassada",
      "parlamentar",
      "parlamentares",
      "bancada",
      "pleito",
      "voto nulo",
      "voto branco",
      "justica eleitoral",
      "santinho",
    ];

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
      "capacitacoes",
      "educacao profissional",
      "curso tecnico",
      "cursos tecnicos",
      "formacao tecnica",
      "tecnologia",
      "inovacao",
      "automacao",
      "robotica",
      "eletromecanica",
      "eletrotecnica",
      "mecanica",
      "soldagem",
      "caldeiraria",
      "metrologia",
      "usinagem",
      "inteligencia artificial",
      "manufatura",
      "manufatura avancada",
      "impressao 3d",
      "gemeo digital",
      "uberaba",
      "vale do rio grande",
      "triangulo mineiro",
      "competitividade",
      "mercado de trabalho",
      "vagas de estagio",
      "jovem aprendiz",
      "aprendizagem industrial",
      "eficiencia energetica",
      "seguranca do trabalho",
      "nr-12",
      "nr-10",
      "manutencao preditiva",
      "iot",
    ];

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
      "webmail",
      "transparencia",
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
      "acesso negado",
      "pagina nao encontrada",
    ];

    this.feeds = [
      {
        url: "https://g1.globo.com/mg/triangulo-mineiro/rss2.xml",
        type: "news",
        subtype: this.CATEGORIES.UBERABA,
        defaultSource: "G1 Triângulo",
      },
      {
        url: 'https://news.google.com/rss/search?q=("SENAI+Uberaba")+when:60d+-eleicao+-politica+-candidato+-partido&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        type: "news",
        subtype: this.CATEGORIES.UBERABA,
        defaultSource: "Notícias de Uberaba",
      },
      {
        url: 'https://news.google.com/rss/search?q=("FIEMG"+OR+"FIEMG+Regional"+"Vale+do+Rio+Grande")+when:60d+-eleicao+-politica+-candidato&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        type: "news",
        subtype: this.CATEGORIES.FIEMG,
        defaultSource: "FIEMG Regional",
      },
      {
        url: 'https://news.google.com/rss/search?q=site:instagram.com+("senaiuberaba"+OR+"fiemgoficial")+when:60d+-eleicao+-politica&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        type: "instagram",
        subtype: this.CATEGORIES.FIEMG,
        handle: "@fiemgoficial",
        defaultSource: "Instagram Oficial",
      },
      {
        url: 'https://news.google.com/rss/search?q=("SENAI+Minas+Gerais"+OR+"SENAI+MG")+when:60d+-eleicao+-politica&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        type: "news",
        subtype: this.CATEGORIES.MG,
        defaultSource: "SENAI Minas Gerais",
      },
      {
        url: "https://news.google.com/rss/search?q=site:linkedin.com/company/fiemg+when:60d+-eleicao+-politica&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        type: "linkedin",
        subtype: this.CATEGORIES.MG,
        handle: "fiemg",
        defaultSource: "LinkedIn FIEMG/SENAI",
      },
      {
        url: 'https://news.google.com/rss/search?q=("SENAI+Nacional"+OR+site:portaldaindustria.com.br+SENAI)+when:60d+-eleicao+-politica&hl=pt-BR&gl=BR&ceid=BR:pt-419',
        type: "news",
        subtype: this.CATEGORIES.NACIONAL,
        defaultSource: "Portal da Indústria",
      },
    ];
  }

  resolveAsset(path) {
    if (!path) return null;
    if (/^(https?:|\/\/|data:)/i.test(path)) {
      return this.proxyMediaUrl(path);
    }
    if (typeof window.getLocalUrl === "function") {
      return window.getLocalUrl(path);
    }
    const cleanPath = path.replace(/^\/+/, "");
    if (window.location.pathname.includes("/user/")) {
      return `../${cleanPath}`;
    }
    return `./${cleanPath}`;
  }

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

  stripAccents(text) {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  normalizeText(text) {
    if (!text) return "";
    return this.stripAccents(String(text).toLowerCase()).trim();
  }

  decodeEntities(str) {
    if (!str) return "";
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }

  normalizeCategory(cat, textContext = "") {
    const raw = (cat + " " + textContext).toUpperCase();
    const clean = this.stripAccents(raw);

    if (clean.includes("UBERABA")) return this.CATEGORIES.UBERABA;
    if (clean.includes("FIEMG")) return this.CATEGORIES.FIEMG;
    if (
      clean.includes("NACIONAL") ||
      clean.includes("BRASIL") ||
      clean.includes("CNI")
    ) {
      return this.CATEGORIES.NACIONAL;
    }
    if (
      clean.includes("MINAS GERAIS") ||
      clean.includes("SENAI MG") ||
      clean.includes("MG")
    ) {
      return this.CATEGORIES.MG;
    }
    return this.CATEGORIES.UBERABA;
  }

  isWithinDateLimit(pubDateStr) {
    if (!pubDateStr) return false;
    const now = Date.now();

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(pubDateStr.trim())) {
      const parts = pubDateStr.trim().split("/");
      const dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
      if (!isNaN(dateObj.getTime())) {
        const diffMs = now - dateObj.getTime();
        return diffMs <= this.MAX_NEWS_AGE_MS && diffMs >= -86400000;
      }
    }

    const parsed = new Date(pubDateStr);
    if (!isNaN(parsed.getTime())) {
      const diffMs = now - parsed.getTime();
      return diffMs <= this.MAX_NEWS_AGE_MS && diffMs >= -86400000;
    }

    return pubDateStr === "Hoje" || pubDateStr === "Recente";
  }

  formatDateToBR(dateInput) {
    if (!dateInput) return "Hoje";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) return dateInput;

    try {
      const d = new Date(dateInput);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    } catch (e) {}

    return "Hoje";
  }

  // ==========================================================================
  // BUSCA LOTE MULTI-DROP DE IA (GEMINI VIA PHP)
  // ==========================================================================

  async fetchAiDropsBatch() {
    const now = Date.now();
    if (
      this.cachedAiDrops.length > 0 &&
      now - this.lastAiFetchTime < this.AI_CACHE_TTL
    ) {
      return this.cachedAiDrops;
    }

    try {
      const endpoint = this.resolveAsset(
        "admin/php/gemini.php?action=batch_drops",
      );
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT_BACKEND,
      );

      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        this.cachedAiDrops = data.map((item) => {
          const icon = item.icon || "✨";
          const titleClean = (item.title || "")
            .replace(/^[^\w\s]+/u, "")
            .trim();
          const validCat = this.normalizeCategory(
            item.category || this.CATEGORIES.UBERABA,
          );

          return {
            type: "news_drop",
            isAi: true,
            title: `${icon} ${titleClean}`,
            summary: item.summary,
            image: null,
            video: null,
            isVideo: false,
            hasVideo: false,
            isInstagram: false,
            isLinkedIn: false,
            category: validCat,
            pubDate: item.tag_type
              ? `${item.tag_type} • IA`
              : "IA SENAI Studio",
            source: "SENAI IA Studio",
            link: "#",
          };
        });

        this.lastAiFetchTime = now;
        return this.cachedAiDrops;
      }

      return this.getFallbackAiDrops();
    } catch (e) {
      return this.getFallbackAiDrops();
    }
  }

  getFallbackAiDrops() {
    return [
      {
        type: "news_drop",
        isAi: true,
        title: "🧠 Qual Dispositivo Protege Contra Sobrecarga?",
        summary:
          "O Relé Térmico. Pelo efeito bimetálico, ele desarma o contator antes do superaquecimento dos enrolamentos do motor.",
        category: this.CATEGORIES.UBERABA,
        pubDate: "DESAFIO TÉCNICO • IA",
        source: "SENAI IA Studio",
        link: "#",
      },
      {
        type: "news_drop",
        isAi: true,
        title: "🔮 Gêmeos Digitais Reduzem Perdas Fabris",
        summary:
          "Simular esteiras e braços robóticos no computador antes da instalação física diminui paradas de linha em até 30%.",
        category: this.CATEGORIES.MG,
        pubDate: "INDÚSTRIA 4.0 • IA",
        source: "SENAI IA Studio",
        link: "#",
      },
      {
        type: "news_drop",
        isAi: true,
        title: "🚀 Técnico em Mecatrônica em Alta na Região",
        summary:
          "A modernização das indústrias em Uberaba e no Triângulo Mineiro elevou a demanda por especialistas em integração de sistemas.",
        category: this.CATEGORIES.FIEMG,
        pubDate: "PROFISSÃO DO FUTURO • IA",
        source: "SENAI IA Studio",
        link: "#",
      },
      {
        type: "news_drop",
        isAi: true,
        title: "💡 Manutenção Preditiva com Sensores IoT",
        summary:
          "Monitorar vibração e temperatura em tempo real avisa sobre desgastes mecânicos semanas antes da quebra de um rolamento.",
        category: this.CATEGORIES.NACIONAL,
        pubDate: "DICA DE OFICINA • IA",
        source: "SENAI IA Studio",
        link: "#",
      },
    ];
  }

  // ==========================================================================
  // INGESTÃO & INTERCALAÇÃO DINÂMICA
  // ==========================================================================

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
      // 1. Busca lote de IA e notícias em paralelo
      const [aiDrops, backendDrops] = await Promise.all([
        this.fetchAiDropsBatch(),
        this.fetchFromBackend(),
      ]);

      let drops = backendDrops;
      if (!drops || drops.length === 0) {
        drops = await this.fetchDirectFeeds();
      }
      if (!drops || drops.length === 0) {
        drops = this.getFallbackDrops();
      }

      // 2. Balanceia notícias por categoria
      let distributedNews = this.distributeDrops(drops);

      // 3. INTERCALAÇÃO ATIVA DA IA:
      // Insere um card inteligente da IA a cada 2 notícias para dar ritmo vibrante à TV!
      const finalDrops = [];
      let aiIndex = 0;
      const totalAi = aiDrops.length;

      // Primeiro slide sempre é um destaque da IA
      if (totalAi > 0) {
        finalDrops.push(aiDrops[aiIndex % totalAi]);
        aiIndex++;
      }

      distributedNews.forEach((newsItem, idx) => {
        finalDrops.push(newsItem);

        // A cada 2 notícias inseridas, adiciona o próximo drop da IA
        if ((idx + 1) % 2 === 0 && aiIndex < totalAi * 2) {
          finalDrops.push(aiDrops[aiIndex % totalAi]);
          aiIndex++;
        }
      });

      this.cachedDrops = finalDrops.slice(0, 18);
      this.lastFetchTime = Date.now();
      this.isFetching = false;
      return this.cachedDrops;
    } catch (error) {
      this.isFetching = false;
      const baseDrops = this.getFallbackDrops();
      const fallbackAi = this.getFallbackAiDrops();
      this.cachedDrops = [
        fallbackAi[0],
        baseDrops[0],
        fallbackAi[1],
        ...baseDrops.slice(1),
      ];
      return this.cachedDrops;
    }
  }

  async fetchFromBackend() {
    try {
      const endpoint = this.resolveAsset("admin/php/get_drops.php");
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT_BACKEND,
      );

      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const rawData = await response.json();
      if (!Array.isArray(rawData) || rawData.length === 0) return null;

      const validItems = rawData.filter((item) =>
        this.isWithinDateLimit(item.pubDate),
      );

      return validItems.map((item) => ({
        type: "news_drop",
        isAi: false,
        title: item.title,
        summary: item.summary,
        image: item.image ? this.resolveAsset(item.image) : null,
        video: item.video ? this.resolveAsset(item.video) : null,
        isVideo: !!item.video,
        hasVideo: !!item.video,
        isInstagram: !!item.isInstagram,
        isLinkedIn: !!item.isLinkedIn,
        category: this.normalizeCategory(item.category, item.title),
        pubDate: item.pubDate || "Hoje",
        source: item.source || "SENAI Notícias",
        link: item.link || "#",
      }));
    } catch (err) {
      return null;
    }
  }

  async fetchDirectFeeds() {
    let allRawItems = [];

    const fetchPromises = this.feeds.map(async (feedConfig) => {
      try {
        const converterUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedConfig.url)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.REQUEST_TIMEOUT_EXTERNAL,
        );

        const res = await fetch(converterUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (
            data.status === "ok" &&
            Array.isArray(data.items) &&
            data.items.length > 0
          ) {
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
      if (Array.isArray(items)) allRawItems = allRawItems.concat(items);
    });

    return this.applySemanticFilter(allRawItems);
  }

  applySemanticFilter(items) {
    const seenTitles = new Set();
    const validDrops = [];

    items.forEach((item) => {
      const metadata = item.feedMetadata || {};
      const isInstagram = metadata.type === "instagram";
      const isLinkedIn = metadata.type === "linkedin";

      if (!this.isWithinDateLimit(item.pubDate)) return;
      const formattedDate = this.formatDateToBR(item.pubDate);

      let titleClean = item.title ? this.decodeEntities(item.title.trim()) : "";
      const itemLink = item.link || "";

      titleClean = titleClean.replace(/\s*[-|]\s*[^-\n|]+$/, "").trim();

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

      const textToAnalyze = this.normalizeText(
        titleClean +
          " " +
          (item.description || "") +
          " " +
          (item.content || ""),
      );

      const isPolitical = this.politicalBlacklist.some((term) =>
        textToAnalyze.includes(term),
      );
      if (isPolitical) return;

      const isRelevant =
        isInstagram ||
        isLinkedIn ||
        this.filterKeywords.some((kw) => textToAnalyze.includes(kw));

      if (!isRelevant) return;

      const titleHash = this.normalizeText(titleClean.substring(0, 45));
      if (seenTitles.has(titleHash)) return;
      seenTitles.add(titleHash);

      const category = this.normalizeCategory(metadata.subtype, textToAnalyze);
      const source = metadata.defaultSource || item.author || "SENAI";

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

      let cleanSummary = this.decodeEntities(
        item.description || item.content || "",
      )
        .replace(/<[^>]*>/g, "")
        .replace(/#\w+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!cleanSummary || cleanSummary.length < 15) {
        cleanSummary =
          "Acompanhe as principais atualizações e projetos no ecossistema da indústria mineira e nacional.";
      } else if (cleanSummary.length > 220) {
        cleanSummary = cleanSummary.substring(0, 217) + "...";
      }

      validDrops.push({
        type: "news_drop",
        isAi: false,
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

  distributeDrops(items) {
    if (!items || items.length === 0) return this.getFallbackDrops();

    const buckets = {
      [this.CATEGORIES.UBERABA]: [],
      [this.CATEGORIES.MG]: [],
      [this.CATEGORIES.FIEMG]: [],
      [this.CATEGORIES.NACIONAL]: [],
    };

    items.forEach((item) => {
      const cat = this.normalizeCategory(item.category);
      if (buckets[cat]) {
        buckets[cat].push(item);
      } else {
        buckets[this.CATEGORIES.UBERABA].push(item);
      }
    });

    const ordered = [];
    const maxLen = Math.max(
      buckets[this.CATEGORIES.UBERABA].length,
      buckets[this.CATEGORIES.MG].length,
      buckets[this.CATEGORIES.FIEMG].length,
      buckets[this.CATEGORIES.NACIONAL].length,
      0,
    );

    for (let i = 0; i < maxLen; i++) {
      for (const catKey of Object.values(this.CATEGORIES)) {
        if (buckets[catKey] && buckets[catKey][i]) {
          ordered.push(buckets[catKey][i]);
        }
      }
    }

    return ordered;
  }

  getFallbackDrops() {
    const today = new Date().toLocaleDateString("pt-BR");

    return [
      {
        type: "news_drop",
        isAi: false,
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
        category: this.CATEGORIES.UBERABA,
        pubDate: today,
        source: "SENAI Regional",
        link: "https://www.senaimg.com.br",
      },
      {
        type: "news_drop",
        isAi: false,
        title: "Laboratórios de Tecnologia e Robótica Aplicada em Uberaba",
        summary:
          "Estrutura moderna conecta os alunos às rotinas reais de programação de CLPs e células robotizadas industriais.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: false,
        isLinkedIn: false,
        category: this.CATEGORIES.UBERABA,
        pubDate: today,
        source: "SENAI Uberaba",
        link: "https://www.senaimg.com.br",
      },
      {
        type: "news_drop",
        isAi: false,
        title:
          "Capacitação Profissional SENAI em Minas Gerais Impulsiona Carreiras",
        summary:
          "Cursos e programas de especialização técnica abrem novas oportunidades para a força de trabalho mineira.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: false,
        isLinkedIn: false,
        category: this.CATEGORIES.MG,
        pubDate: today,
        source: "SENAI Minas Gerais",
        link: "https://www.senaimg.com.br",
      },
      {
        type: "news_drop",
        isAi: false,
        title: "FIEMG Regional Vale do Rio Grande Impulsiona Novos Negócios",
        summary:
          "Encontros de competitividade e desenvolvimento de fornecedores fortalecem o polo industrial do Triângulo Mineiro.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: false,
        isLinkedIn: true,
        category: this.CATEGORIES.FIEMG,
        pubDate: today,
        source: "FIEMG Oficial",
        link: "https://www.fiemg.com.br",
      },
      {
        type: "news_drop",
        isAi: false,
        title: "Inovação Tecnológica e Indústria 4.0 no Ecossistema Brasileiro",
        summary:
          "O SENAI Nacional promove a modernização das fábricas com consultorias em manufatura avançada, inteligência artificial e automação.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: false,
        isLinkedIn: false,
        category: this.CATEGORIES.NACIONAL,
        pubDate: today,
        source: "Portal da Indústria",
        link: "https://www.portaldaindustria.com.br",
      },
    ];
  }
}

window.DropsEngineInstance = new DropsEngine();
