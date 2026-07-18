/**
 * DropsEngine - Motor de Agregação de Conteúdo e Notícias em Tempo Real
 * Versão com suporte a LinkedIn, Proxy de Mídia, Tratamento de Erros e Fallback de Notícias
 */
class DropsEngine {
  constructor() {
    this.filterKeywords = [
      "fiemg",
      "senai",
      "cni",
      "industria",
      "minas gerais",
      "capacitacao",
      "educacao profissional",
      "tecnologia",
      "inovacao",
      "sesi",
      "iel",
      "uberaba",
      "vale do rio grande",
      "triangulo mineiro",
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
    ];

    this.titleBlacklist = [
      "usuario nao autenticado",
      "intranet",
      "trabalhe conosco",
      "vaga",
      "auxiliar",
      "analista de",
      "recrutamento",
      "selecao",
      "home -",
      "login",
    ];

    this.feeds = [
      {
        url: "https://rsshub.rssforever.com/instagram/user/senaiuberaba",
        type: "instagram",
        subtype: "SENAI Uberaba",
        handle: "@senaiuberaba",
        fallbackImage: "../../admin/images/fallbacks/senai.jpg",
      },
      {
        url: "https://rsshub.rssforever.com/instagram/user/fiemgregionalvaledoriogrande",
        type: "instagram",
        subtype: "FIEMG Regional Vale do Rio Grande",
        handle: "@fiemgregionalvaledoriogrande",
        fallbackImage: "../../admin/images/fallbacks/fiemg.jpg",
      },
      {
        url: "https://rsshub.rssforever.com/instagram/user/fiemgoficial",
        type: "instagram",
        subtype: "FIEMG Oficial",
        handle: "@fiemgoficial",
        fallbackImage: "../../admin/images/fallbacks/fiemg.jpg",
      },
      {
        url: "https://rsshub.rssforever.com/instagram/user/senai_nacional",
        type: "instagram",
        subtype: "SENAI Nacional",
        handle: "@senai_nacional",
        fallbackImage: "../../admin/images/fallbacks/senai.jpg",
      },
      {
        // Novo feed do LinkedIn da FIEMG usando RSSHub
        url: "https://rsshub.rssforever.com/linkedin/company/fiemg/posts",
        type: "linkedin",
        subtype: "LinkedIn FIEMG",
        handle: "fiemg",
        fallbackImage: "../../admin/images/fallbacks/linkedin.jpg",
      },
      {
        url: "https://g1.globo.com/mg/triangulo-mineiro/rss2.xml",
        type: "news",
        subtype: "G1 Triângulo Mineiro",
      },
      {
        url: "https://g1.globo.com/dynamo/economia/rss2.xml",
        type: "news",
        subtype: "G1 Economia",
      },
      {
        url: "https://news.google.com/rss/search?q=site:fiemg.com.br+-site:pessoas.fiemg.com.br+-site:intranet.fiemg.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        type: "news",
        subtype: "Portal FIEMG",
      },
      {
        url: "https://news.google.com/rss/search?q=site:portaldaindustria.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419",
        type: "news",
        subtype: "Portal da Indústria",
      },
    ];
  }

  // Tratamento de Proxy para evitar o erro 403 (Bloqueio de Hotlink da CDN do Meta e LinkedIn)
  proxyMediaUrl(url) {
    if (!url) return null;
    if (
      url.includes("cdninstagram.com") ||
      url.includes("fbcdn.net") ||
      url.includes("licdn.com") // Incluído para imagens de servidores do LinkedIn
    ) {
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  async fetchAndProcessDrops() {
    let allArticles = [];

    const fetchPromises = this.feeds.map(async (feedConfig) => {
      try {
        const converterUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedConfig.url)}`;
        const res = await fetch(converterUrl);

        if (res.ok) {
          const data = await res.json();
          if (data.status === "ok" && data.items && data.items.length > 0) {
            return data.items.map((item) => ({
              ...item,
              feedMetadata: feedConfig,
            }));
          }
        }

        throw new Error(`Erro na API RSS (Status: ${res.status})`);
      } catch (e) {
        if (feedConfig.type === "instagram") {
          console.warn(
            `[DropsEngine] Feed externo do Instagram (${feedConfig.subtype}) indisponível ou bloqueado (HTTP 422). Carregando posts simulados locais.`,
          );
          return this.getMockInstagramPosts(feedConfig);
        } else if (feedConfig.type === "linkedin") {
          console.warn(
            `[DropsEngine] Feed externo do LinkedIn (${feedConfig.subtype}) indisponível ou bloqueado. Carregando posts simulados locais.`,
          );
          return this.getMockLinkedInPosts(feedConfig);
        } else {
          console.warn(
            `[DropsEngine] Feed externo de notícias (${feedConfig.subtype}) indisponível (HTTP 422). Carregando notícias simuladas locais de backup.`,
          );
          return this.getMockNewsPosts(feedConfig);
        }
      }
    });

    const results = await Promise.all(fetchPromises);
    results.forEach((items) => {
      if (items) {
        allArticles = allArticles.concat(items);
      }
    });

    return this.applySemanticFilter(allArticles);
  }

  applySemanticFilter(items) {
    const normalize = (str) =>
      str
        ? str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
        : "";

    const seenTitles = new Set();
    const categoryBuckets = {
      "SENAI Uberaba": [],
      "FIEMG Regional Vale do Rio Grande": [],
      "LinkedIn FIEMG": [], // Novo balde de categoria
      "FIEMG Oficial": [],
      "SENAI Nacional": [],
      Geral: [],
    };

    items.forEach((item) => {
      const metadata = item.feedMetadata || {};
      const isInstagram = metadata.type === "instagram";
      const isLinkedIn = metadata.type === "linkedin";
      let titleClean = item.title ? item.title.trim() : "";
      const itemLink = item.link || "";

      // Pula blacklists para redes sociais para evitar falsos positivos
      if (!isInstagram && !isLinkedIn) {
        const hasBlacklistedUrl = this.urlBlacklist.some((badUrl) =>
          itemLink.toLowerCase().includes(badUrl),
        );
        if (hasBlacklistedUrl) return;

        const hasBlacklistedTitle = this.titleBlacklist.some((badTitle) =>
          titleClean.toLowerCase().includes(badTitle),
        );
        if (hasBlacklistedTitle) return;

        if (titleClean.length < 15) return;
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

      let category = "Geral";
      let source = item.author || "Portal";

      if (isInstagram || isLinkedIn) {
        category = metadata.subtype;
        source = isInstagram
          ? `Instagram ${metadata.handle}`
          : `LinkedIn FIEMG`;

        const plainTextDesc = (item.description || "")
          .replace(/<[^>]*>/g, "")
          .replace(/#\w+/g, "")
          .trim();

        if (
          !titleClean ||
          titleClean.toLowerCase().includes("instagram") ||
          titleClean.toLowerCase().includes("linkedin") ||
          titleClean.length < 5
        ) {
          titleClean =
            plainTextDesc.length > 45
              ? plainTextDesc.substring(0, 45) + "..."
              : plainTextDesc || "Publicação na Rede Social";
        }
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

      if (seenTitles.has(titleClean)) return;
      seenTitles.add(titleClean);

      const decodeHTMLEntities = (str) => {
        if (!str) return "";
        return str
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
      };

      // -----------------------------------------------------------------
      // DETECÇÃO E SANITIZAÇÃO DE MÍDIA (IMAGENS E VÍDEOS)
      // -----------------------------------------------------------------
      let rawImageUrl = null;
      let videoUrl = null;
      let isVideo = false;

      const enclosures = [];
      if (item.enclosure) {
        if (Array.isArray(item.enclosure)) {
          enclosures.push(...item.enclosure);
        } else if (typeof item.enclosure === "object") {
          enclosures.push(item.enclosure);
        }
      }

      for (const enc of enclosures) {
        const encLink = enc.link || "";
        const encType = enc.type || "";

        if (
          encType.includes("video") ||
          encLink.match(/\.(mp4|m4v|webm|mov|ogg)/i)
        ) {
          videoUrl = encLink;
          isVideo = true;
        } else if (
          encType.includes("image") ||
          encLink.match(/\.(jpeg|jpg|png|webp|gif|svg)/i)
        ) {
          rawImageUrl = encLink;
        }
      }

      if (!rawImageUrl && item.thumbnail) {
        rawImageUrl = item.thumbnail;
      }
      if (!rawImageUrl && item.image) {
        rawImageUrl = item.image;
      }

      const htmlBody = decodeHTMLEntities(
        (item.description || "") + " " + (item.content || ""),
      );

      if (!rawImageUrl) {
        const imgMatch = htmlBody.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) rawImageUrl = imgMatch[1];
      }

      if (!videoUrl) {
        const videoMatch = htmlBody.match(/<video[^>]+src=["']([^"']+)["']/i);
        if (videoMatch) {
          videoUrl = videoMatch[1];
          isVideo = true;
        } else {
          const srcMatch = htmlBody.match(/<source[^>]+src=["']([^"']+)["']/i);
          if (srcMatch) {
            videoUrl = srcMatch[1];
            isVideo = true;
          } else {
            const linkMatch = htmlBody.match(
              /href=["']([^"']+\.(mp4|m4v|webm|mov)[^"']*)["']/i,
            );
            if (linkMatch) {
              videoUrl = linkMatch[1];
              isVideo = true;
            }
          }
        }
      }

      if (
        !rawImageUrl ||
        rawImageUrl.includes("pixel") ||
        rawImageUrl.length < 5
      ) {
        rawImageUrl =
          metadata.fallbackImage ||
          "../../admin/images/fallbacks/industria.jpg";
      }

      const safeImageUrl = this.proxyMediaUrl(rawImageUrl);

      let cleanSummary = (item.description || "")
        .replace(/<[^>]*>/g, "")
        .replace(/#\w+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const dropItem = {
        type: "news_drop",
        title: titleClean,
        summary:
          cleanSummary ||
          "Acesse a publicação completa para obter os detalhes.",
        image: safeImageUrl,
        rawImage: rawImageUrl,
        video: videoUrl,
        isVideo: isVideo,
        hasVideo: isVideo,
        isInstagram: isInstagram,
        isLinkedIn: isLinkedIn,
        category: category,
        pubDate: item.pubDate || "Atualizado",
        source: source,
        link: itemLink || "https://www.linkedin.com",
      };

      if (categoryBuckets[category]) {
        categoryBuckets[category].push(dropItem);
      } else {
        categoryBuckets["Geral"].push(dropItem);
      }
    });

    const filteredDrops = [];
    const buckets = [
      categoryBuckets["SENAI Uberaba"],
      categoryBuckets["FIEMG Regional Vale do Rio Grande"],
      categoryBuckets["LinkedIn FIEMG"], // Organizado no round-robin de exibição
      categoryBuckets["FIEMG Oficial"],
      categoryBuckets["SENAI Nacional"],
      categoryBuckets["Geral"],
    ];

    const maxLength = Math.max(...buckets.map((b) => b.length));

    for (let i = 0; i < maxLength; i++) {
      for (const bucket of buckets) {
        if (bucket && bucket[i]) {
          filteredDrops.push(bucket[i]);
        }
      }
    }

    return filteredDrops.slice(0, 12);
  }

  // Mock de Backup para o LinkedIn FIEMG (Caso o feed do RSSHub fique offline)
  getMockLinkedInPosts(feed) {
    const mockDatabase = {
      fiemg: [
        {
          title: "FIEMG debate produtividade e o futuro do mercado em Minas",
          description:
            "Como parte das ações contínuas de fomento à competitividade industrial, a FIEMG realiza encontros estratégicos para conectar empresas e profissionais do setor mineiro.",
          link: "https://www.linkedin.com/company/fiemg/posts/?feedView=all",
          pubDate: "Publicado recentemente no LinkedIn",
          thumbnail: "../../admin/images/fallbacks/fiemg.jpg",
          enclosure: null,
        },
        {
          title: "Qualificação Profissional: A base para uma indústria forte",
          description:
            "Em parceria com o SESI e o SENAI, a Federação segue expandindo ofertas educativas focadas em preparar profissionais para o novo ecossistema industrial.",
          link: "https://www.linkedin.com/company/fiemg/posts/?feedView=all",
          pubDate: "Publicado recentemente no LinkedIn",
          thumbnail: "../../admin/images/fallbacks/fiemg.jpg",
          enclosure: null,
        },
      ],
    };

    const items = mockDatabase[feed.handle] || [];
    return items.map((item) => ({
      ...item,
      feedMetadata: feed,
    }));
  }

  getMockInstagramPosts(feed) {
    const handle = feed.handle;

    const mockDatabase = {
      "@senaiuberaba": [
        {
          title: "Inscrições Abertas no SENAI Uberaba",
          description:
            "Oportunidade na região! O SENAI Uberaba está com inscrições abertas para novos cursos técnicos presenciais em Automação e Eletromecânica.",
          link: "https://www.instagram.com/senaiuberaba/",
          pubDate: "Publicado hoje",
          thumbnail: "../../admin/images/fallbacks/senai.jpg",
          enclosure: null,
        },
        {
          title: "Aulas Práticas de Robótica Industrial",
          description:
            "Acompanhe nossos alunos operando células robóticas no laboratório de automação avançada do SENAI Uberaba.",
          link: "https://www.instagram.com/senaiuberaba/",
          pubDate: "Publicado ontem",
          thumbnail: "../../admin/images/fallbacks/senai.jpg",
          enclosure: {
            link: "https://assets.mixkit.co/videos/preview/mixkit-electronic-board-soldering-close-up-41617-large.mp4",
            type: "video/mp4",
          },
        },
      ],
      "@fiemgregionalvaledoriogrande": [
        {
          title: "Encontro Empresarial em Uberaba",
          description:
            "Reunião promovida pela FIEMG Regional Vale do Rio Grande para impulsionar a competitividade industrial no Triângulo Mineiro.",
          link: "https://www.instagram.com/fiemgregionalvaledoriogrande/",
          pubDate: "Publicado hoje",
          thumbnail: "../../admin/images/fallbacks/fiemg.jpg",
          enclosure: null,
        },
      ],
      "@fiemgoficial": [
        {
          title: "Inovação no Ecossistema Mineiro",
          description:
            "FIEMG promove fórum de inovação unindo grandes indústrias e startups tecnológicas de Minas Gerais.",
          link: "https://www.instagram.com/fiemgoficial/",
          pubDate: "Publicado hoje",
          thumbnail: "../../admin/images/fallbacks/fiemg.jpg",
          enclosure: {
            link: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-working-on-a-computer-40845-large.mp4",
            type: "video/mp4",
          },
        },
      ],
      "@senai_nacional": [
        {
          title: "Educação Profissional para a Indústria",
          description:
            "Programas de qualificação profissional promovidos pelo SENAI Nacional para preparar trabalhadores para as demandas do mercado.",
          link: "https://www.instagram.com/senai_nacional/",
          pubDate: "Publicado ontem",
          thumbnail: "../../admin/images/fallbacks/senai.jpg",
          enclosure: null,
        },
      ],
    };

    const items = mockDatabase[handle] || [];
    return items.map((item) => ({
      ...item,
      feedMetadata: feed,
    }));
  }

  getMockNewsPosts(feed) {
    const subtype = feed.subtype;
    const mockNewsDatabase = {
      "G1 Triângulo Mineiro": [
        {
          title:
            "SENAI Uberaba abre novos laboratórios de Automação Industrial",
          description:
            "Estruturas visam qualificar mão de obra técnica para as indústrias químicas e de fertilizantes do Vale do Rio Grande.",
          link: "https://g1.globo.com/mg/triangulo-mineiro/",
          pubDate: "Atualizado hoje",
          thumbnail: "../../admin/images/fallbacks/senai.jpg",
        },
      ],
      "Portal FIEMG": [
        {
          title:
            "FIEMG Regional Vale do Rio Grande debate competitividade em Uberaba",
          description:
            "Encontro com empresários promove o fortalecimento e expansão de fornecedores no Triângulo Mineiro.",
          link: "https://www.fiemg.com.br",
          pubDate: "Atualizado hoje",
          thumbnail: "../../admin/images/fallbacks/fiemg.jpg",
        },
      ],
      "Portal da Indústria": [
        {
          title:
            "SENAI lança milhares de vagas em cursos de Qualificação Profissional",
          description:
            "Oportunidades em tecnologia, mecânica de precisão e eletrônica industrial para jovens e adultos em todo o país.",
          link: "https://www.portaldaindustria.com.br",
          pubDate: "Atualizado ontem",
          thumbnail: "../../admin/images/fallbacks/industria.jpg",
        },
      ],
    };

    const items = mockNewsDatabase[subtype] || [];
    return items.map((item) => ({
      ...item,
      feedMetadata: feed,
    }));
  }
}

window.DropsEngineInstance = new DropsEngine();
