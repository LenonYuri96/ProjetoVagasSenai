class MediaViewer {
  constructor() {
    this.previousData = null;
    this.currentSlideshow = null;
    this.currentIndex = 0;
    this.isVideoPlaying = false;
    this.shouldUnmuteAll = true; // Alterado para true para vídeos iniciarem com som
    this.mediaElements = [];

    this.init();
  }

  async init() {
    this.setupClock();
    await this.fetchDataAndStartSlideshow();
    setInterval(() => this.fetchDataAndStartSlideshow(), 5000);
  }

  async fetchDataAndStartSlideshow() {
    try {
      const response = await fetch("../admin/config.json");
      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();

      if (JSON.stringify(data) !== JSON.stringify(this.previousData)) {
        this.previousData = data;
        this.startSlideshow(data);
      }
    } catch (error) {
      console.error("Erro ao carregar slideshow:", error);
      this.showErrorNotification();
    }
  }

  startSlideshow(slides) {
    this.cleanupPreviousSlideshow();
    this.currentIndex = 0;
    this.prepareMediaContainers(slides);

    if (slides.length > 0) {
      this.showItem(this.currentIndex, slides);
    }
  }

  prepareMediaContainers(slides) {
    const displayArea = document.getElementById("display-area");
    displayArea.innerHTML = "";
    this.mediaElements = [];

    slides.forEach((item, index) => {
      const container = document.createElement("div");
      container.className = "media-container";
      container.id = `media-${index}`;

      let mediaElement;
      if (item.type === "image") {
        mediaElement = document.createElement("img");
        mediaElement.src = `../../admin/uploads/photos/${item.file}`;
        mediaElement.alt = `Imagem ${index + 1}`;
        mediaElement.style.maxWidth = "100%";
        mediaElement.style.maxHeight = "100%";
        mediaElement.style.objectFit = "contain";
      } else {
        mediaElement = document.createElement("video");
        mediaElement.src = `../../admin/uploads/videos/${item.file}`;
        mediaElement.controls = true;
        mediaElement.muted = !this.shouldUnmuteAll;
        mediaElement.style.width = "100%";
        mediaElement.style.height = "100%";
        mediaElement.style.objectFit = "contain";
      }

      mediaElement.className = "media-content";
      container.appendChild(mediaElement);
      displayArea.appendChild(container);

      this.mediaElements.push({
        element: mediaElement,
        type: item.type,
        displayTime: (item.display_time || 5) * 1000, // Usa o tempo do JSON ou 5s padrão
      });
    });
  }

  showItem(index, slides) {
    const currentMedia = this.mediaElements[index];
    if (!currentMedia) return;

    // Esconder todos os elementos de mídia
    this.mediaElements.forEach((media) => {
      media.element.classList.remove("active");
      media.element.style.opacity = 0;
    });

    // Mostrar o elemento atual com efeito de fade
    currentMedia.element.classList.add("active");
    currentMedia.element.style.opacity = 0;

    // Configurar transição após um pequeno delay para garantir que o elemento está pronto
    setTimeout(() => {
      currentMedia.element.style.transition = "opacity 1s ease-in-out";
      currentMedia.element.style.opacity = 1;
    }, 50);

    if (currentMedia.type === "image") {
      this.isVideoPlaying = false;

      // Configurar o tempo de exibição da imagem
      this.currentSlideshow = setTimeout(() => {
        // Efeito de fade out antes de mudar
        currentMedia.element.style.opacity = 0;

        setTimeout(() => {
          this.nextItem(slides);
        }, 1000); // Tempo da transição de fade out
      }, currentMedia.displayTime);
    } else {
      this.isVideoPlaying = true;
      const video = currentMedia.element;

      // Configurações essenciais para o vídeo
      video.muted = false; // Sempre tentar com som ativado
      video.playsInline = true; // Importante para iOS
      video.setAttribute("playsinline", ""); // Atributo para iOS
      video.setAttribute("webkit-playsinline", ""); // Atributo para Safari iOS

      // Estratégia avançada para reprodução com som
      const handlePlayback = () => {
        // Primeiro tenta reproduzir com som
        video
          .play()
          .then(() => {
            console.log("Vídeo reproduzido com som com sucesso");
            // Esconder qualquer botão de play que possa estar visível
            const existingBtn = document.querySelector(".video-play-button");
            if (existingBtn) existingBtn.remove();
          })
          .catch((error) => {
            console.warn("Autoplay com som falhou, tentando sem som:", error);

            // Tenta reproduzir sem som como fallback
            video.muted = true;
            video
              .play()
              .then(() => {
                console.log("Vídeo reproduzido sem som");
                this.showUnmuteButton(video);
              })
              .catch((error) => {
                console.error("Falha ao reproduzir vídeo:", error);
                this.showPlayButton(video);
              });
          });
      };

      // Primeira tentativa de reprodução
      handlePlayback();

      // Configurar eventos para tentar novamente após interação do usuário
      const interactionHandler = () => {
        handlePlayback();
        // Remover os listeners após a primeira interação
        document.removeEventListener("click", interactionHandler);
        document.removeEventListener("touchstart", interactionHandler);
        document.removeEventListener("keydown", interactionHandler);
      };

      // Adicionar listeners para vários tipos de interação
      document.addEventListener("click", interactionHandler, { once: true });
      document.addEventListener("touchstart", interactionHandler, {
        once: true,
      });
      document.addEventListener("keydown", interactionHandler, { once: true });

      // Configurar evento de término do vídeo
      video.onended = () => {
        this.isVideoPlaying = false;
        // Fade out antes de mudar para o próximo item
        video.style.opacity = 0;
        setTimeout(() => {
          this.nextItem(slides);
        }, 1000);
      };

      // Configurar evento para detectar quando o som é ativado
      video.onvolumechange = () => {
        if (!video.muted) {
          this.shouldUnmuteAll = true;
          this.unmuteAllVideos();
        }
      };
    }
  }

  showPlayButton(video) {
    // Remover botão existente se houver
    const existingBtn = document.querySelector(".video-play-button");
    if (existingBtn) existingBtn.remove();

    const playBtn = document.createElement("button");
    playBtn.className = "video-play-button";
    playBtn.innerHTML = '<i class="fas fa-play"></i> Reproduzir Vídeo';
    playBtn.onclick = () => {
      video.muted = false; // Tentar com som primeiro
      video
        .play()
        .then(() => playBtn.remove())
        .catch((e) => {
          console.warn("Falha ao reproduzir com som, tentando sem som:", e);
          video.muted = true;
          video
            .play()
            .then(() => {
              playBtn.remove();
              this.showUnmuteButton(video);
            })
            .catch((e) => console.error("Falha ao reproduzir vídeo:", e));
        });
    };

    const displayArea = document.getElementById("display-area");
    displayArea.appendChild(playBtn);
  }

  showUnmuteButton(video) {
    // Remover botão existente se houver
    const existingBtn = document.querySelector(".unmute-btn");
    if (existingBtn) existingBtn.remove();

    const unmuteBtn = document.createElement("button");
    unmuteBtn.className = "unmute-btn";
    unmuteBtn.innerHTML = '<i class="fas fa-volume-mute"></i> Ativar Som';
    unmuteBtn.onclick = () => {
      video.muted = false;
      video
        .play() // Tentar reproduzir novamente após ativar o som
        .then(() => unmuteBtn.remove())
        .catch((e) => console.error("Erro ao reproduzir com som:", e));
    };

    const displayArea = document.getElementById("display-area");
    displayArea.appendChild(unmuteBtn);
  }

  nextItem(slides) {
    this.currentIndex = (this.currentIndex + 1) % slides.length;
    this.showItem(this.currentIndex, slides);
  }

  unmuteAllVideos() {
    this.mediaElements.forEach((media) => {
      if (media.type === "video") {
        media.element.muted = false;
      }
    });
  }

  cleanupPreviousSlideshow() {
    if (this.currentSlideshow) {
      clearTimeout(this.currentSlideshow);
    }
    this.mediaElements.forEach((media) => {
      if (media.type === "video" && !media.element.paused) {
        media.element.pause();
      }
    });
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

  showErrorNotification() {
    const notification = document.createElement("div");
    notification.className = "error-notification";
    notification.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        Erro ao carregar conteúdo. Tentando novamente...
      `;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 5000);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new MediaViewer();
});
