class AdminSlideshow {
  constructor() {
    this.uploadedItems = [];
    this.currentIndex = 0;
    this.isVideoPlaying = false;
    this.shouldUnmuteAll = false;
    this.transitionTime = 1; // segundos
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
    displayArea.innerHTML = "";

    if (item.type === "image") {
      this.showImage(item, displayArea);
    } else if (item.type === "video") {
      this.showVideo(item, displayArea);
    }
  }

  showImage(item, displayArea) {
    const img = document.createElement("img");
    img.src = `./uploads/photos/${item.file}`;
    img.alt = "Imagem carregada";
    img.style.width = "100%";
    img.style.height = "auto";
    displayArea.appendChild(img);

    this.isVideoPlaying = false;

    // Configura transições
    displayArea.classList.remove("fade-in", "fade-out");
    displayArea.classList.add("fade-out");

    setTimeout(() => {
      displayArea.classList.remove("fade-out");
      displayArea.classList.add("fade-in");

      const displayTime = (item.display_time || 1) * 1000;
      setTimeout(() => {
        displayArea.classList.remove("fade-in");
        this.nextItem();
      }, displayTime);
    }, this.transitionTime * 1000);
  }

  showVideo(item, displayArea) {
    this.isVideoPlaying = true;
    const video = document.createElement("video");
    video.src = `./uploads/videos/${item.file}`;
    video.autoplay = true;
    video.muted = !this.shouldUnmuteAll;
    video.style.width = "100%";
    video.style.height = "auto";
    video.controls = true;
    displayArea.appendChild(video);

    displayArea.classList.remove("fade-in", "fade-out");

    video.play().catch((error) => {
      console.error("Erro ao reproduzir vídeo:", error);
      this.isVideoPlaying = false;
      this.nextItem();
    });

    video.onvolumechange = () => {
      if (!video.muted) {
        this.shouldUnmuteAll = true;
        this.unmuteAllVideos();
      }
    };

    video.onended = () => {
      this.isVideoPlaying = false;
      this.nextItem();
    };
  }

  nextItem() {
    this.currentIndex = (this.currentIndex + 1) % this.uploadedItems.length;
    this.showItem(this.currentIndex);
  }

  unmuteAllVideos() {
    document.querySelectorAll("video").forEach((video) => {
      video.muted = false;
    });
  }
}

// Torna acessível globalmente para o MediaManager
window.startSlideshow = function (items) {
  new AdminSlideshow().start(items);
};
