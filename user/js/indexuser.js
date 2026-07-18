/**
 * MediaViewer - Motor de Controle de Slideshow e Painel de TV
 * Gerencia a renderização, reprodução sequencial e gatilhos de exibição em Smart TVs.
 *
 * ATUALIZAÇÃO: Sincronização em tempo real (20s) com "Hot-Swap em Memória",
 * e suporte a imagens de fallback locais personalizadas por categoria (senai, fiemg, instagram, industria).
 */
class MediaViewer {
  constructor() {
    this.localSlides = [];
    this.newsDrops = [];
    this.compiledQueue = [];
    this.currentIndex = 0;
    this.slideshowTimeout = null;
    this.progressTimer = null;
    this.currentVideoListener = null;
    this.mediaElements = [];

    // Hashes para monitorar mudanças de estado de forma independente
    this.previousLocalHash = "";
    this.previousNewsHash = "";

    // Flag para reconstrução de fila em memória (evita page reload e perda de fullscreen)
    this.needsRebuild = false;

    this.isFullscreenActive = false;

    this.init();
  }

  init() {
    this.setupClock();
    this.setupWeather(); // Inicializa o clima nativo em texto/emoji
    this.setupGlobalInteractions();
    this.setupTvFullscreenMode();
    this.startPollingCycles();
  }

  setupClock() {
    const updateClock = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const clockElement = document.getElementById("clock");
      if (clockElement) {
        clockElement.textContent = timeString;
      }
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  /**
   * Clima Nativo em tempo real - Open-Meteo API
   */
  setupWeather() {
    const updateWeather = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=-19.75&longitude=-47.94&current_weather=true",
        );
        if (res.ok) {
          const data = await res.json();
          const temp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;

          const weatherMap = {
            0: { desc: "Céu Limpo", emoji: "☀️" },
            1: { desc: "Limpo", emoji: "🌤️" },
            2: { desc: "Parc. Nublado", emoji: "⛅" },
            3: { desc: "Nublado", emoji: "☁️" },
            45: { desc: "Nevoeiro", emoji: "🌫️" },
            48: { desc: "Nevoeiro", emoji: "🌫️" },
            51: { desc: "Chuvisco", emoji: "🌧️" },
            53: { desc: "Chuvisco", emoji: "🌧️" },
            55: { desc: "Chuvisco", emoji: "🌧️" },
            61: { desc: "Chuva Leve", emoji: "🌧️" },
            63: { desc: "Chuva", emoji: "🌧️" },
            65: { desc: "Chuva Forte", emoji: "🌧️" },
            71: { desc: "Neve Leve", emoji: "❄️" },
            73: { desc: "Neve", emoji: "❄️" },
            75: { desc: "Neve Forte", emoji: "❄️" },
            77: { desc: "Granizo", emoji: "🌨️" },
            80: { desc: "Pancadas", emoji: "🌧️" },
            81: { desc: "Pancadas", emoji: "🌧️" },
            82: { desc: "Tempestade", emoji: "⛈️" },
            85: { desc: "Pancadas Neve", emoji: "❄️" },
            86: { desc: "Pancadas Neve", emoji: "❄️" },
            95: { desc: "Tempestade", emoji: "⛈️" },
            96: { desc: "Tempestade", emoji: "⛈️" },
            99: { desc: "Tempestade", emoji: "⛈️" },
          };

          const weatherInfo = weatherMap[code] || {
            desc: "Clima",
            emoji: "🌡️",
          };
          const weatherElement = document.getElementById("weather-display");
          if (weatherElement) {
            weatherElement.innerHTML = `
              <span class="weather-city">UBERABA</span>
              <span class="weather-temp">${temp}°C</span>
              <span class="weather-emoji">${weatherInfo.emoji}</span>
              <span class="weather-desc">${weatherInfo.desc}</span>
            `;
          }
        }
      } catch (error) {
        console.warn(
          "Falha ao buscar dados climáticos no Open-Meteo:",
          error.message,
        );
      }
    };

    updateWeather();
    setInterval(updateWeather, 15 * 60 * 1000);
  }

  /**
   * Monitoramento de novas mídias locais e canais externos
   */
  startPollingCycles() {
    this.syncLocalContent();
    this.syncExternalContent();

    // 1. MONITORAMENTO LOCAL RÁPIDO (A cada 20 segundos)
    setInterval(() => this.syncLocalContent(), 20 * 1000);

    // 2. MONITORAMENTO DE REDES SOCIAIS E NOTÍCIAS (A cada 10 minutos)
    setInterval(() => this.syncExternalContent(), 10 * 60 * 1000);
  }

  /**
   * Puxa e verifica atualizações de mídias locais (config.json)
   */
  async syncLocalContent() {
    try {
      const configRes = await fetch("../admin/config.json", {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (!configRes.ok) throw new Error("Falha ao puxar config.json");
      const localData = await configRes.json();

      const localHash = JSON.stringify(localData);

      if (this.previousLocalHash === "") {
        this.previousLocalHash = localHash;
        this.localSlides = localData;
        this.compileSlideshowQueue();
      } else if (localHash !== this.previousLocalHash) {
        console.log(
          "[MediaViewer] Novas mídias locais detectadas! Agendando atualização na memória...",
        );
        this.previousLocalHash = localHash;
        this.localSlides = localData;
        this.needsRebuild = true;
      }
    } catch (error) {
      console.warn("Erro ao sincronizar mídias locais:", error.message);
    }
  }

  /**
   * Puxa e verifica atualizações das mídias externas (notícias e Instagram)
   */
  async syncExternalContent() {
    try {
      if (window.DropsEngineInstance) {
        const fetchedNews =
          await window.DropsEngineInstance.fetchAndProcessDrops();
        const newsHash = JSON.stringify(fetchedNews);

        if (this.previousNewsHash === "") {
          this.previousNewsHash = newsHash;
          this.newsDrops = fetchedNews;
          this.compileSlideshowQueue();
        } else if (newsHash !== this.previousNewsHash) {
          console.log(
            "[MediaViewer] Novidades nas redes sociais/notícias! Agendando atualização na memória...",
          );
          this.previousNewsHash = newsHash;
          this.newsDrops = fetchedNews;
          this.needsRebuild = true;
        }
      }
    } catch (error) {
      console.warn(
        "Erro ao sincronizar canais corporativos externos:",
        error.message,
      );
    }
  }

  /**
   * Intercala: 1 Drops da Indústria/Instagram para cada 2 mídias cadastradas pelo Admin
   */
  compileSlideshowQueue() {
    this.cleanupCurrentTimer();
    this.compiledQueue = [];

    let localIdx = 0;
    let newsIdx = 0;

    while (
      localIdx < this.localSlides.length ||
      newsIdx < this.newsDrops.length
    ) {
      for (let k = 0; k < 2 && localIdx < this.localSlides.length; k++) {
        this.compiledQueue.push(this.localSlides[localIdx++]);
      }
      if (newsIdx < this.newsDrops.length) {
        this.compiledQueue.push(this.newsDrops[newsIdx++]);
      }
    }

    if (this.compiledQueue.length === 0) {
      this.compiledQueue = this.localSlides;
    }

    this.currentIndex = 0;
    this.renderMediaElements();

    if (this.compiledQueue.length > 0) {
      this.displayCurrentIndex();
    }
  }

  /**
   * Renderiza os elementos com estrutura de fallbacks locais inteligentes (sem telas pretas)
   */
  renderMediaElements() {
    const displayArea = document.getElementById("display-area");
    if (!displayArea) return;

    displayArea.innerHTML = "";
    this.mediaElements = [];

    this.compiledQueue.forEach((item, index) => {
      const container = document.createElement("div");
      container.className = "media-container";

      let mediaElement;

      // RESOLUÇÃO: Escolhe de forma inteligente a imagem local baseada no tipo ou categoria do drop
      let localFallback = "../../admin/images/fallbacks/industria.jpg";
      if (item.isInstagram) {
        localFallback = "../../admin/images/fallbacks/instagram.jpg";
      } else if (item.category && item.category.includes("SENAI")) {
        localFallback = "../../admin/images/fallbacks/senai.jpg";
      } else if (item.category && item.category.includes("FIEMG")) {
        localFallback = "../../admin/images/fallbacks/fiemg.jpg";
      }

      if (item.type === "news_drop") {
        const dropsCard = document.createElement("div");
        dropsCard.className = `drops-card ${item.isInstagram ? "instagram-style" : ""}`;

        const leftPane = document.createElement("div");
        const hasVideo = item.isVideo || item.hasVideo;

        // Duplo tratamento de fallback com onerror para evitar telas vazias
        if (hasVideo && item.video) {
          leftPane.className = "drops-image-pane";
          leftPane.innerHTML = `
            <video class="drops-img" src="${item.video}" autoplay muted loop playsinline referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            </video>
            <img src="${item.image || localFallback}" alt="Notícia" class="drops-img fallback-image" style="display:none;" referrerpolicy="no-referrer" onerror="this.src='${localFallback}';">
            <div class="drops-image-overlay"></div>
          `;
        } else if (item.image) {
          leftPane.className = "drops-image-pane";
          leftPane.innerHTML = `
            <img src="${item.image}" alt="Notícia" class="drops-img" referrerpolicy="no-referrer" onerror="this.src='${localFallback}';">
            <div class="drops-image-overlay"></div>
          `;
        } else {
          leftPane.className = "drops-fallback-pane";
          let iconClass = "fa-industry";
          if (item.category.includes("Instagram")) iconClass = "fa-instagram";
          else if (
            item.category === "SENAI MG" ||
            item.category === "SENAI Nacional" ||
            item.category === "SENAI Uberaba"
          )
            iconClass = "fa-graduation-cap";
          else if (item.category.includes("FIEMG")) iconClass = "fa-building";

          leftPane.innerHTML = `
            <i class="fas ${iconClass} drops-fallback-icon"></i>
            <div class="drops-image-overlay"></div>
          `;
        }

        const rightPane = document.createElement("div");
        rightPane.className = "drops-info-pane";

        const mainTagHtml = item.isInstagram
          ? `<span class="drops-main-tag drops-instagram-badge"><i class="fab fa-instagram me-1"></i> Instagram</span>`
          : `<span class="drops-main-tag"><i class="fas fa-bolt me-1 animate-pulse"></i> Drops da Indústria</span>`;

        rightPane.innerHTML = `
          <div class="drops-badge-row">
            ${mainTagHtml}
            <span class="drops-category-tag">${item.category}</span>
          </div>
          <h2 class="drops-headline">${item.title}</h2>
          <p class="drops-summary">${item.summary || "Acesse o portal do SENAI para conferir todos os detalhes e desdobramentos desta matéria pública."}</p>
          <div class="drops-source-row">
            <span class="drops-source-badge">${item.source}</span>
            <span><i class="far fa-calendar-alt me-1"></i> ${item.pubDate}</span>
          </div>
        `;

        dropsCard.appendChild(leftPane);
        dropsCard.appendChild(rightPane);
        container.appendChild(dropsCard);

        mediaElement = dropsCard;
      } else {
        if (item.type === "image") {
          mediaElement = document.createElement("img");
          mediaElement.src = `../../admin/uploads/photos/${item.file}`;
          mediaElement.alt = `Campaign ${index}`;
          mediaElement.style.width = "100%";
          mediaElement.style.height = "100%";
          mediaElement.style.objectFit = "contain";

          mediaElement.onerror = () => {
            mediaElement.src = localFallback;
          };
        } else {
          mediaElement = document.createElement("video");
          mediaElement.src = `../../admin/uploads/videos/${item.file}`;
          mediaElement.preload = "auto";
          mediaElement.style.width = "100%";
          mediaElement.style.height = "100%";
          mediaElement.style.objectFit = "contain";
          mediaElement.muted = true;
          mediaElement.playsInline = true;
          mediaElement.setAttribute("playsinline", "");
          mediaElement.setAttribute("webkit-playsinline", "");

          mediaElement.onerror = () => {
            console.warn(`Erro no carregamento do arquivo local: ${item.file}`);
          };
        }
        container.appendChild(mediaElement);
      }

      displayArea.appendChild(container);

      this.mediaElements.push({
        container: container,
        element: mediaElement,
        type: item.type,
        hasVideo: item.isVideo || item.hasVideo || false,
        displayTime:
          item.type === "news_drop"
            ? 12 * 1000
            : (item.display_time || 5) * 1000,
      });
    });
  }

  async displayCurrentIndex() {
    this.cleanupCurrentTimer();

    const currentMedia = this.mediaElements[this.currentIndex];
    if (!currentMedia) return;

    this.mediaElements.forEach((item, idx) => {
      if (idx !== this.currentIndex) {
        item.container.classList.remove("active");
        if (item.type === "video") {
          item.element.pause();
          item.element.currentTime = 0;
        } else if (item.type === "news_drop" && item.hasVideo) {
          const v = item.element.querySelector("video");
          if (v) {
            v.pause();
            v.currentTime = 0;
          }
        }
      }
    });

    currentMedia.container.classList.add("active");

    this.removeFloatingAudioHint();

    const isNewsWithVideo =
      currentMedia.type === "news_drop" && currentMedia.hasVideo;

    if (currentMedia.type === "image" || currentMedia.type === "news_drop") {
      this.updateProgressBar(currentMedia.displayTime);

      this.slideshowTimeout = setTimeout(() => {
        this.advanceSlideshow();
      }, currentMedia.displayTime);

      if (isNewsWithVideo) {
        const video = currentMedia.element.querySelector("video");
        if (video) {
          try {
            video.currentTime = 0;
            video.loop = true;
            await video.play();

            if (window.globalUserHasInteracted) {
              video.muted = false;
            } else {
              this.createFloatingAudioHint(video);
            }
          } catch (error) {
            console.warn(
              "Autoplay do vídeo da notícia bloqueado:",
              error.message,
            );
            video.muted = true;
            video
              .play()
              .catch((e) => console.error("Erro ao forçar play mutado:", e));
          }
        }
      }
    } else {
      let video = currentMedia.element;

      if (video) {
        video.onerror = () => {
          console.warn(
            "Falha crítica no vídeo local do admin. Avançando slideshow...",
          );
          this.advanceSlideshow();
        };

        try {
          video.currentTime = 0;
          await video.play();

          if (window.globalUserHasInteracted) {
            video.muted = false;
          } else {
            this.createFloatingAudioHint(video);
          }

          this.updateProgressBarForVideo(video);
        } catch (error) {
          console.warn(
            "Autoplay do vídeo local bloqueado pelo navegador:",
            error.message,
          );
          video.muted = true;
          video.play().catch((e) => {
            console.error("Falha ao inicializar player local:", e);
            this.advanceSlideshow();
          });
          this.createFloatingAudioHint(video);
          this.updateProgressBarForVideo(video);
        }

        video.onended = () => {
          this.advanceSlideshow();
        };
      } else {
        this.updateProgressBar(5000);
        this.slideshowTimeout = setTimeout(() => this.advanceSlideshow(), 5000);
      }
    }
  }

  /**
   * Avança de slide ou reconstrói dinamicamente a fila em memória (Hot-Swap) sem reloads
   */
  advanceSlideshow() {
    if (this.needsRebuild) {
      console.log(
        "[MediaViewer] Novas mídias detectadas. Atualizando a fila na memória de forma transparente...",
      );
      this.needsRebuild = false;
      this.compileSlideshowQueue();
      return;
    }

    if (this.compiledQueue.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.compiledQueue.length;
    this.displayCurrentIndex();
  }

  /**
   * Executa a barra de progresso em tempo real baseada em transição CSS acelerada
   */
  updateProgressBar(duration) {
    const progressBar = document.getElementById("slide-progress-bar");
    if (!progressBar) return;

    progressBar.style.transition = "none";
    progressBar.style.width = "0%";

    progressBar.offsetHeight;

    progressBar.style.transition = `width ${duration}ms linear`;
    progressBar.style.width = "100%";
  }

  /**
   * Vincula o preenchimento da barra de progresso diretamente ao andamento nativo do vídeo
   */
  updateProgressBarForVideo(video) {
    const progressBar = document.getElementById("slide-progress-bar");
    if (!progressBar) return;

    progressBar.style.transition = "none";
    progressBar.style.width = "0%";

    const onTimeUpdate = () => {
      if (video.duration) {
        const percent = (video.currentTime / video.duration) * 100;
        progressBar.style.transition = "width 0.15s linear";
        progressBar.style.width = `${percent}%`;
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    this.currentVideoListener = { video, listener: onTimeUpdate };
  }

  cleanupVideoListener() {
    if (this.currentVideoListener) {
      const { video, listener } = this.currentVideoListener;
      video.removeEventListener("timeupdate", listener);
      this.currentVideoListener = null;
    }
  }

  setupGlobalInteractions() {
    const enableGlobalAudio = () => {
      window.globalUserHasInteracted = true;
      this.unmuteAllVideos();
      this.removeFloatingAudioHint();
    };

    document.addEventListener("click", enableGlobalAudio, { once: true });
    document.addEventListener("touchstart", enableGlobalAudio, { once: true });
    document.addEventListener("keydown", enableGlobalAudio, { once: true });
  }

  unmuteAllVideos() {
    this.mediaElements.forEach((item) => {
      if (item.type === "video") {
        item.element.muted = false;
      } else if (item.type === "news_drop" && item.hasVideo) {
        const v = item.element.querySelector("video");
        if (v) v.muted = false;
      }
    });
  }

  setupTvFullscreenMode() {
    const overlay = document.getElementById("tv-activation-overlay");
    if (!overlay) return;

    const requestFullscreenOnTV = () => {
      const docEl = document.documentElement;

      const requestFS =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (requestFS) {
        requestFS
          .call(docEl)
          .then(() => {
            this.isFullscreenActive = true;
            overlay.classList.add("hidden");
            window.globalUserHasInteracted = true;
            this.unmuteAllVideos();
            this.removeFloatingAudioHint();
          })
          .catch((err) => {
            console.warn(
              "Navegador de TV bloqueou fullscreen por políticas restritivas:",
              err,
            );
            overlay.classList.add("hidden");
            window.globalUserHasInteracted = true;
          });
      } else {
        overlay.classList.add("hidden");
        window.globalUserHasInteracted = true;
      }
    };

    // TENTATIVA PROGRAMÁTICA IMEDIATA:
    setTimeout(() => {
      const docEl = document.documentElement;
      const requestFS =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (requestFS && !this.isFullscreenActive) {
        requestFS
          .call(docEl)
          .then(() => {
            console.log("[MediaViewer] Tela cheia automática iniciada.");
            this.isFullscreenActive = true;
            overlay.classList.add("hidden");
            window.globalUserHasInteracted = true;
            this.unmuteAllVideos();
          })
          .catch(() => {
            console.log(
              "[MediaViewer] Tela cheia automática indisponível na carga inicial. Aguardando clique.",
            );
          });
      }
    }, 1000);

    overlay.addEventListener("click", requestFullscreenOnTV);
    overlay.addEventListener("touchstart", requestFullscreenOnTV);
    document.addEventListener("keydown", (e) => {
      if (!this.isFullscreenActive) {
        requestFullscreenOnTV();
      }
    });

    const handleFullscreenChange = () => {
      const activeFS =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      if (!activeFS) {
        this.isFullscreenActive = false;
        overlay.classList.remove("hidden");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
  }

  createFloatingAudioHint(activeVideo) {
    this.removeFloatingAudioHint();

    const hint = document.createElement("button");
    hint.className = "unmute-btn fade-in";
    hint.innerHTML =
      '<i class="fas fa-volume-mute me-2"></i> Ativar Som da Transmissão';
    hint.style.position = "absolute";
    hint.style.bottom = "24px";
    hint.style.right = "24px";
    hint.style.zIndex = "999";

    hint.onclick = (e) => {
      e.stopPropagation();
      window.globalUserHasInteracted = true;
      activeVideo.muted = false;
      hint.remove();
    };

    const displayArea = document.getElementById("display-area");
    if (displayArea) displayArea.appendChild(hint);
  }

  removeFloatingAudioHint() {
    const existingHint = document.querySelector(".unmute-btn");
    if (existingHint) existingHint.remove();
  }

  cleanupCurrentTimer() {
    if (this.slideshowTimeout) {
      clearTimeout(this.slideshowTimeout);
    }
    this.cleanupVideoListener();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new MediaViewer();
});
