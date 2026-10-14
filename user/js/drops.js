/**
 * ============================================================================
 * DropsEngine - Motor Unificado de Conteúdo, Notícias em Tempo Real & IA
 * SENAI Uberaba & FIEMG Regional Vale do Rio Grande
 *
 * Arquitetura e Políticas de Exibição:
 * 1. Taxonomia Restrita às 4 Categorias Oficiais:
 *    - SENAI UBERABA   (Unidade local, cursos técnicos e comunidade regional)
 *    - SENAI MG        (Capacitação estadual, polos de inovação em Minas)
 *    - FIEMG           (Indústria, economia regional, eventos empresariais)
 *    - SENAI NACIONAL  (Tendências de Indústria 4.0, CNI e tecnologia)
 *
 * 2. Segurança Institucional e Filtro Antipolítica:
 *    - Descarte de qualquer menção a eleições, partidos, mandatos,
 *      candidaturas, disputas partidárias ou escândalos governamentais.
 *
 * 3. Validade Temporal Estrita (Janela de 60 Dias):
 *    - Elimina sumariamente conteúdos publicados há mais de 60 dias da data atual
 *      ou postagens com carimbo no futuro (> 24h).
 *
 * 4. Pílula de Conhecimento Inteligente (Google Gemini via backend PHP):
 *    - Injeção prioritária de cards dinâmicos gerados por IA com cache de memória.
 *
 * 5. Resiliência Total (Operação 100% Offline):
 *    - Base de contingência rica cobrindo as 4 categorias se a rede oscilar.
 * ============================================================================
 */

class DropsEngine {
  constructor() {
    // ===== ESTADO DO MOTOR =====
    this.cachedDrops = [];
    this.cachedAiDrop = null;
    this.lastAiFetchTime = 0;
    this.isFetching = false;
    this.lastFetchTime = 0;

    // ===== CONSTANTES DE TEMPORIZAÇÃO (CACHE & JANELAS) =====
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos de cache em memória para notícias
    this.AI_CACHE_TTL = 30 * 60 * 1000; // 30 minutos de cache em memória para a IA
    this.REQUEST_TIMEOUT_BACKEND = 4500; // Timeout máximo para o backend PHP (ms)
    this.REQUEST_TIMEOUT_EXTERNAL = 3500; // Timeout máximo para feeds externos (ms)

    // ===== JANELA MÁXIMA DE IDADE: 60 DIAS =====
    this.MAX_NEWS_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 5.184.000.000 ms

    // ===== ENUMERAÇÃO OFICIAL DAS 4 CATEGORIAS =====
    this.CATEGORIES = Object.freeze({
      UBERABA: "SENAI UBERABA",
      MG: "SENAI MG",
      FIEMG: "FIEMG",
      NACIONAL: "SENAI NACIONAL",
    });

    // ===== LISTA NEGRA EXTENSA: POLÍTICA, ELEIÇÕES E PARTIDOS =====
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
      "governanca politica",
      "cassacao",
      "cassado",
      "cassada",
      "parlamentar",
      "parlamentares",
      "bancada",
      "bancada ruralista",
      "bancada evangélica",
      "pleito",
      "voto nulo",
      "voto branco",
      "justica eleitoral",
      "marqueteiro",
      "horario politico",
      "santinho",
      "impugnacao",
      "mensalao",
      "lava jato",
    ];

    // ===== LISTA BRANCA POSITIVA: TERMOS DA INDÚSTRIA & FORMAÇÃO =====
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
      "manufatura aditiva",
      "impressao 3d",
      "gemeo digital",
      "gemeos digitais",
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
      "internet das coisas",
    ];

    // ===== LISTA NEGRA ADMINISTRATIVA E PÁGINAS DO SISTEMA =====
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
      "termos de uso",
      "politica de privacidade",
    ];

    // ===== CANAIS E FEEDS DIRETOS COM EXCLUSÕES NATIVAS =====
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

  // ==========================================================================
  // MÉTODOS DE SUPORTE E NORMALIZAÇÃO DE DADOS
  // ==========================================================================

  /**
   * Resolve caminhos de mídia estáticos, dinâmicos ou de CDNs externas
   */
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

  /**
   * Contorna bloqueios 403 de hotlink de imagens externas via CDN segura
   */
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

  /**
   * Remove acentuação e caracteres diacríticos para busca semântica fiel
   */
  stripAccents(text) {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  /**
   * Normaliza textos inteiros para minúsculas sem pontuações especiais
   */
  normalizeText(text) {
    if (!text) return "";
    return this.stripAccents(String(text).toLowerCase()).trim();
  }

  /**
   * Decodifica entidades HTML presentes em feeds RSS (ex: &amp;, &#39;, &quot;)
   */
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

  /**
   * Mapeamento estrito e sem ambiguidades para as 4 categorias oficiais
   */
  normalizeCategory(cat, textContext = "") {
    const raw = (cat + " " + textContext).toUpperCase();
    const clean = this.stripAccents(raw);

    if (clean.includes("UBERABA")) {
      return this.CATEGORIES.UBERABA;
    }
    if (clean.includes("FIEMG")) {
      return this.CATEGORIES.FIEMG;
    }
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

  /**
   * Valida se uma data está estritamente dentro da janela de 60 dias
   */
  isWithinDateLimit(pubDateStr) {
    if (!pubDateStr) return false;
    const now = Date.now();

    // 1. Caso a data esteja em formato brasileiro DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(pubDateStr.trim())) {
      const parts = pubDateStr.trim().split("/");
      const dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
      if (!isNaN(dateObj.getTime())) {
        const diffMs = now - dateObj.getTime();
        return diffMs <= this.MAX_NEWS_AGE_MS && diffMs >= -86400000;
      }
    }

    // 2. Caso a data esteja em formato ISO / RFC 822 de feeds RSS
    const parsed = new Date(pubDateStr);
    if (!isNaN(parsed.getTime())) {
      const diffMs = now - parsed.getTime();
      return diffMs <= this.MAX_NEWS_AGE_MS && diffMs >= -86400000;
    }

    // Se for string simbólica ("Hoje", "Recente") considera recente
    if (pubDateStr === "Hoje" || pubDateStr === "Recente") {
      return true;
    }

    return false;
  }

  /**
   * Formata a data para padrão brasileiro de exibição (DD/MM/AAAA)
   */
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
  // INTEGRAÇÃO COM INTELIGÊNCIA ARTIFICIAL (GEMINI STUDIO VIA PHP)
  // ==========================================================================

  /**
   * Busca ou recupera em cache a Pílula de Conhecimento da IA
   */
  async fetchAiDrop() {
    const now = Date.now();
    if (this.cachedAiDrop && now - this.lastAiFetchTime < this.AI_CACHE_TTL) {
      return this.cachedAiDrop;
    }

    try {
      const endpoint = this.resolveAsset(
        "admin/php/gemini.php?action=daily_tip",
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

      if (!response.ok) {
        throw new Error(`API de IA respondeu com status ${response.status}`);
      }

      const data = await response.json();

      if (data && data.title && data.summary) {
        const titleFormatted = data.title.startsWith("✨")
          ? data.title
          : `✨ ${data.title}`;

        const validCat = this.normalizeCategory(
          data.category || this.CATEGORIES.UBERABA,
        );

        this.cachedAiDrop = {
          type: "news_drop",
          isAi: true,
          title: titleFormatted,
          summary: data.summary,
          image: null,
          video: null,
          isVideo: false,
          hasVideo: false,
          isInstagram: false,
          isLinkedIn: false,
          category: validCat,
          pubDate: "Pílula do Dia • IA",
          source: "SENAI IA Studio",
          link: "#",
        };

        this.lastAiFetchTime = now;
        return this.cachedAiDrop;
      }

      return this.getFallbackAiDrop();
    } catch (e) {
      console.warn(
        "[DropsEngine] IA indisponível, ativando contingência:",
        e.message,
      );
      return this.getFallbackAiDrop();
    }
  }

  /**
   * Pílulas industriais inteligentes para contingência offline da IA
   */
  getFallbackAiDrop() {
    const aiPool = [
      {
        title: "✨ Manutenção Preditiva e IoT",
        summary:
          "Sensores térmicos e de vibração conectados à nuvem antecipam paradas em motores industriais antes que ocorra a falha mecânica.",
        category: this.CATEGORIES.UBERABA,
      },
      {
        title: "✨ Eficiência Energética na Indústria",
        summary:
          "Algoritmos inteligentes ajustam em tempo real a demanda elétrica de compressores e fornos, reduzindo custos em até 22%.",
        category: this.CATEGORIES.MG,
      },
      {
        title: "✨ Gêmeos Digitais na Manufatura",
        summary:
          "A simulação virtual completa da linha de produção permite testar novos fluxos fabris sem interromper as atividades físicas.",
        category: this.CATEGORIES.FIEMG,
      },
      {
        title: "✨ Visão Computacional e NR-12",
        summary:
          "Câmeras inteligentes detectam o uso correto de EPIs e monitoram zonas de perigo em tempo real nas células de usinagem.",
        category: this.CATEGORIES.NACIONAL,
      },
    ];

    const chosen =
      aiPool[Math.floor(Date.now() / (1000 * 60 * 60)) % aiPool.length];

    return {
      type: "news_drop",
      isAi: true,
      title: chosen.title,
      summary: chosen.summary,
      image: null,
      video: null,
      isVideo: false,
      hasVideo: false,
      isInstagram: false,
      isLinkedIn: false,
      category: chosen.category,
      pubDate: "Pílula do Dia • IA",
      source: "SENAI IA Studio",
      link: "#",
    };
  }

  // ==========================================================================
  // ESTRATÉGIAS DE CAPTURA E INGESTÃO DE NOTÍCIAS
  // ==========================================================================

  /**
   * Orquestrador principal: busca fontes, filtra dados e intercala slides
   */
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
      // 1. Dispara em paralelo a chamada da IA
      const aiDropPromise = this.fetchAiDrop();

      // 2. Consulta primária via Backend PHP (com cache rápido)
      let drops = await this.fetchFromBackend();

      // 3. Contingência secundária via Feeds RSS diretos (Client-side)
      if (!drops || drops.length === 0) {
        drops = await this.fetchDirectFeeds();
      }

      // 4. Contingência terciária: Base estática offline
      if (!drops || drops.length === 0) {
        drops = this.getFallbackDrops();
      }

      // 5. Aguarda IA e faz a distribuição balanceada
      const aiCard = await aiDropPromise;
      let finalDrops = this.distributeDrops(drops);

      if (aiCard) {
        finalDrops.unshift(aiCard);
      }

      this.cachedDrops = finalDrops;
      this.lastFetchTime = Date.now();
      this.isFetching = false;
      return this.cachedDrops;
    } catch (error) {
      console.warn(
        "[DropsEngine] Erro geral de ingestão. Ativando contingência:",
        error.message,
      );
      this.isFetching = false;
      const baseDrops = this.getFallbackDrops();
      const fallbackAi = this.getFallbackAiDrop();
      this.cachedDrops = [fallbackAi, ...baseDrops];
      return this.cachedDrops;
    }
  }

  /**
   * Estratégia 1: Conexão direta com get_drops.php
   */
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

      // Validação estrita de idade (<= 60 dias)
      const validItems = rawData.filter((item) => {
        return this.isWithinDateLimit(item.pubDate);
      });

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

  /**
   * Estratégia 2: Feeds diretos via RSS2JSON caso o backend PHP esteja inacessível
   */
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
      if (Array.isArray(items)) {
        allRawItems = allRawItems.concat(items);
      }
    });

    return this.applySemanticFilter(allRawItems);
  }

  // ==========================================================================
  // FILTRAGEM SEMÂNTICA, ANTIPOLÍTICA E SANITIZAÇÃO
  // ==========================================================================

  /**
   * Processa itens brutos eliminando notícias velhas, políticas e sem relevância
   */
  applySemanticFilter(items) {
    const seenTitles = new Set();
    const validDrops = [];

    items.forEach((item) => {
      const metadata = item.feedMetadata || {};
      const isInstagram = metadata.type === "instagram";
      const isLinkedIn = metadata.type === "linkedin";

      // 1. VALIDAÇÃO ESTREITA DE IDADE (<= 60 DIAS)
      if (!this.isWithinDateLimit(item.pubDate)) {
        return; // Descarta notícia velha
      }
      const formattedDate = this.formatDateToBR(item.pubDate);

      // 2. SANITIZAÇÃO DO TÍTULO
      let titleClean = item.title ? this.decodeEntities(item.title.trim()) : "";
      const itemLink = item.link || "";

      // Remove sufixos de jornais (ex: "Título - G1", "Título | Notícias")
      titleClean = titleClean.replace(/\s*[-|]\s*[^-\n|]+$/, "").trim();

      // 3. LISTAS NEGRAS ADMINISTRATIVAS
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

      // 4. BLOQUEIO DE POLÍTICA, ELEIÇÕES E PARTIDOS
      const isPolitical = this.politicalBlacklist.some((term) =>
        textToAnalyze.includes(term),
      );
      if (isPolitical) {
        return; // Descarta imediatamente qualquer conteúdo político
      }

      // 5. FILTRO DE RELEVÂNCIA (PARA FEEDS ABERTOS COMO G1)
      const isRelevant =
        isInstagram ||
        isLinkedIn ||
        this.filterKeywords.some((kw) => textToAnalyze.includes(kw));

      if (!isRelevant) {
        return; // Descarta matérias que não possuem relação com o SENAI ou Indústria
      }

      // 6. DEDUPLICAÇÃO
      const titleHash = this.normalizeText(titleClean.substring(0, 45));
      if (seenTitles.has(titleHash)) return;
      seenTitles.add(titleHash);

      // 7. ENQUADRAMENTO ESTRITO NAS 4 CATEGORIAS
      const category = this.normalizeCategory(metadata.subtype, textToAnalyze);
      const source = metadata.defaultSource || item.author || "SENAI";

      // 8. EXTRAÇÃO E TRATAMENTO DE IMAGENS
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

      // 9. HIGIENIZAÇÃO DO RESUMO PARA A TV
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

  // ==========================================================================
  // DISTRIBUIÇÃO BALANCEADA ENTRE AS 4 CATEGORIAS
  // ==========================================================================

  /**
   * Distribuição equilibrada em rodízio (Round-Robin) entre as 4 categorias
   */
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

    // Limita o carrossel a 16 drops de notícias para dinamismo ideal na TV
    return ordered.slice(0, 16);
  }

  // ==========================================================================
  // BASE DE CONTINGÊNCIA RESILIENTE (100% OFFLINE)
  // ==========================================================================

  /**
   * Coleção de cards oficiais nas 4 categorias para operação sem conexão à internet
   */
  getFallbackDrops() {
    const today = new Date().toLocaleDateString("pt-BR");

    return [
      // 1. SENAI UBERABA
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

      // 2. SENAI MG
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
        title: "Inovação e Eficiência Produtiva no Polo Industrial Mineiro",
        summary:
          "Consultorias especializadas auxiliam as indústrias de Minas Gerais a otimizar processos e reduzir desperdícios.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: false,
        isLinkedIn: false,
        category: this.CATEGORIES.MG,
        pubDate: today,
        source: "SENAI MG",
        link: "https://www.senaimg.com.br",
      },

      // 3. FIEMG
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
        title: "Desenvolvimento Sustentável e Competitividade na Indústria",
        summary:
          "A FIEMG assessora empresas na transição energética e na implementação de práticas ESG alinhadas ao mercado global.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: true,
        isLinkedIn: false,
        category: this.CATEGORIES.FIEMG,
        pubDate: today,
        source: "Instagram @fiemgoficial",
        link: "https://www.fiemg.com.br",
      },

      // 4. SENAI NACIONAL
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
      {
        type: "news_drop",
        isAi: false,
        title: "Olimpíada do Conhecimento e Excelência Técnica Nacional",
        summary:
          "Estudantes de todo o país demonstram habilidades profissionais em competições alinhadas aos mais altos padrões globais.",
        image: null,
        video: null,
        isVideo: false,
        hasVideo: false,
        isInstagram: false,
        isLinkedIn: false,
        category: this.CATEGORIES.NACIONAL,
        pubDate: today,
        source: "CNI / SENAI Nacional",
        link: "https://www.portaldaindustria.com.br",
      },
    ];
  }
}

// ============================================================================
// INSTANCIAÇÃO GLOBAL ÚNICA (SINGLETON PATTERN)
// ============================================================================
window.DropsEngineInstance = new DropsEngine();
