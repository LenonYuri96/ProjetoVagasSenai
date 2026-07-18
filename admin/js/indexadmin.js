/**
 * AdminSlideshow - Controlador do Preview de Slides (Singleton Pattern)
 * Evita vazamento de memória e concorrência de timeouts na área de administração.
 *
 * CORREÇÃO: Vinculação de escopo explícita (bind) no construtor para evitar erro de "this" indefinido.
 */
class AdminSlideshow {
  constructor() {
    if (AdminSlideshow.instance) {
      AdminSlideshow.instance.destroy();
    }
    AdminSlideshow.instance = this;

    this.uploadedItems = [];
    this.currentIndex = 0;
    this.slideshowTimeout = null;
    this.activeVideoElement = null;

    // Vinculação explícita para blindar o escopo do "this" contra perdas no loop de eventos
    this.nextItem = this.nextItem.bind(this);
    this.showItem = this.showItem.bind(this);
    this.showImage = this.showImage.bind(this);
    this.showVideo = this.showVideo.bind(this);
    this.showNewsDrop = this.showNewsDrop.bind(this);
  }

  start(items) {
    this.uploadedItems = items;
    if (this.uploadedItems.length === 0) return;

    this.currentIndex = 0;
    this.showItem(this.currentIndex);
  }

  showItem(index) {
    const item = this.uploadedItems[index];
    const displayArea = document.getElementById("display-area");
    if (!displayArea) return;

    const previewContainer = displayArea.querySelector(".preview-container");
    if (!previewContainer) return;

    previewContainer.innerHTML = "";
    this.cleanupCurrentMedia();

    if (item.type === "image") {
      this.showImage(item, previewContainer);
    } else if (item.type === "video") {
      this.showVideo(item, previewContainer);
    } else if (item.type === "news_drop") {
      this.showNewsDrop(item, previewContainer);
    }
  }

  showImage(item, container) {
    const img = document.createElement("img");
    img.src = `./uploads/photos/${item.file}`;
    img.alt = "Preview do Slide";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.className = "fade-in";
    container.appendChild(img);

    const displayTime = (item.display_time || 5) * 1000;
    this.slideshowTimeout = setTimeout(() => {
      this.nextItem();
    }, displayTime);
  }

  showVideo(item, container) {
    const video = document.createElement("video");
    video.src = `./uploads/videos/${item.file}`;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "contain";
    video.autoplay = true;
    video.muted = true; // Mantém mutado no Admin por usabilidade
    video.controls = true;
    video.className = "fade-in";
    container.appendChild(video);

    this.activeVideoElement = video;

    video.play().catch((error) => {
      console.warn(
        "Autoplay bloqueado na visualização administrativa:",
        error.message,
      );
      this.nextItem();
    });

    video.onended = () => {
      this.nextItem();
    };
  }

  /**
   * Renderiza o Card de Notícias em tempo real exatamente como é exibido na TV
   */
  showNewsDrop(item, container) {
    const dropsCard = document.createElement("div");
    dropsCard.className = "drops-card fade-in";
    dropsCard.style.width = "100%";
    dropsCard.style.height = "100%";
    dropsCard.style.display = "grid";
    dropsCard.style.gridTemplateColumns = "1.1fr 1fr";
    dropsCard.style.backgroundColor = "#090d16";
    dropsCard.style.color = "white";

    // Lado Esquerdo: Imagem ou Vídeo do Drop
    const leftPane = document.createElement("div");
    leftPane.className = "drops-image-pane";
    leftPane.style.position = "relative";
    leftPane.style.width = "100%";
    leftPane.style.height = "100%";
    leftPane.style.overflow = "hidden";
    leftPane.style.backgroundColor = "#000";

    if (item.hasVideo && item.video) {
      leftPane.innerHTML = `
        <video class="drops-img" style="width: 100%; height: 100%; object-fit: cover;" autoplay muted loop>
          <source src="${item.video}" type="video/mp4">
        </video>
        <div class="drops-image-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, rgba(9, 13, 22, 0) 60%, rgba(9, 13, 22, 1) 100%);"></div>
      `;
      this.activeVideoElement = leftPane.querySelector("video");
    } else if (item.image) {
      leftPane.innerHTML = `
        <img src="${item.image}" alt="Notícia" class="drops-img" style="width: 100%; height: 100%; object-fit: cover;">
        <div class="drops-image-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, rgba(9, 13, 22, 0) 60%, rgba(9, 13, 22, 1) 100%);"></div>
      `;
    } else {
      leftPane.style.background =
        "linear-gradient(135deg, #02315d 0%, #031529 100%)";
      leftPane.style.display = "flex";
      leftPane.style.alignItems = "center";
      leftPane.style.justifyContent = "center";

      let iconClass = "fa-industry";
      if (
        item.category === "Uberaba" ||
        item.category === "Minas Gerais" ||
        item.category.includes("Uberaba")
      ) {
        iconClass = "fa-map-marker-alt";
      } else if (item.category === "SENAI") {
        iconClass = "fa-graduation-cap";
      }

      leftPane.innerHTML = `
        <i class="fas ${iconClass} drops-fallback-icon" style="font-size: 5rem; color: rgba(255, 255, 255, 0.05); transform: rotate(-15deg);"></i>
        <div class="drops-image-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, rgba(9, 13, 22, 0) 60%, rgba(9, 13, 22, 1) 100%);"></div>
      `;
    }

    // Lado Direito: Informações e Metadados do letreiro
    const rightPane = document.createElement("div");
    rightPane.className = "drops-info-pane";
    rightPane.style.padding = "1.5rem";
    rightPane.style.display = "flex";
    rightPane.style.flexDirection = "column";
    rightPane.style.justifyContent = "center";
    rightPane.style.backgroundColor = "#090d16";
    rightPane.style.textAlign = "left";

    rightPane.innerHTML = `
      <div class="drops-badge-row" style="display: flex; gap: 8px; margin-bottom: 0.8rem; align-items: center;">
        <span class="drops-main-tag" style="background: linear-gradient(135deg, #045cac 0%, #00a1e4 100%); color: white; padding: 4px 10px; font-weight: 800; font-size: 0.65rem; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
          <i class="fas fa-bolt me-1 animate-pulse"></i> Drops da Indústria
        </span>
        <span class="drops-category-tag" style="background: rgba(255, 255, 255, 0.1); color: #e2e8f0; padding: 4px 10px; font-weight: 700; font-size: 0.65rem; border-radius: 4px; text-transform: uppercase;">
          ${item.category}
        </span>
      </div>
      <h4 class="drops-headline" style="font-size: 1.15rem; font-weight: 800; line-height: 1.3; color: white; margin-bottom: 0.8rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.title}</h4>
      <p class="drops-summary" style="font-size: 0.8rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
        ${item.summary}
      </p>
      <div class="drops-source-row" style="display: flex; align-items: center; gap: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 0.8rem; font-size: 0.75rem; color: #64748b; margin-top: auto;">
        <span class="drops-source-badge" style="background-color: #1e293b; color: #cbd5e1; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${item.source}</span>
        <span><i class="far fa-calendar-alt me-1"></i> ${item.pubDate}</span>
      </div>
    `;

    dropsCard.appendChild(leftPane);
    dropsCard.appendChild(rightPane);
    container.appendChild(dropsCard);

    // Se o Drop contiver vídeo integrado, deixa o vídeo guiar o tempo do slide
    if (item.hasVideo && this.activeVideoElement) {
      this.activeVideoElement.play().catch(() => {
        this.slideshowTimeout = setTimeout(() => this.nextItem(), 12000);
      });
      this.activeVideoElement.onended = () => this.nextItem();
    } else {
      this.slideshowTimeout = setTimeout(() => {
        this.nextItem();
      }, 12000); // Exibe por 12 segundos fixos no painel admin
    }
  }

  nextItem() {
    if (this.uploadedItems.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.uploadedItems.length;
    this.showItem(this.currentIndex);
  }

  cleanupCurrentMedia() {
    if (this.slideshowTimeout) {
      clearTimeout(this.slideshowTimeout);
      this.slideshowTimeout = null;
    }
    if (this.activeVideoElement) {
      try {
        this.activeVideoElement.pause();
        this.activeVideoElement.onended = null;
      } catch (e) {}
      this.activeVideoElement = null;
    }
  }

  destroy() {
    this.cleanupCurrentMedia();
    this.uploadedItems = [];
  }
}

window.startSlideshow = function (items) {
  const previewer = new AdminSlideshow();
  previewer.start(items);
};
