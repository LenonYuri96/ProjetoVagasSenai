/**
 * MediaManager - Controlador de Campanhas, Uploads e Drops da Indústria (Painel Administrativo)
 * Centraliza validações de arquivos pesados, progresso de upload e requisições HTTP assíncronas.
 */
class MediaManager {
  constructor() {
    this.selectedFiles = [];
    this.uploadedItems = [];
    this.MAX_UPLOAD_SIZE = 500 * 1024 * 1024; // 500MB
    this.allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    this.initElements();
    this.setupEventListeners();
    this.updateUploadedList();
  }

  initElements() {
    this.elements = {
      dropZone: document.getElementById("drop-zone"),
      fileInput: document.getElementById("file-input"),
      feedbackMessage: document.getElementById("feedback-message"),
      filePreviewList: document.getElementById("file-preview-list"),
      uploadedList: document.getElementById("uploaded-list"),
      uploadButton: document.getElementById("upload-btn"),
      progressContainer: document.getElementById("progress-container"),
      progressBar: document.getElementById("progress-bar"),
      progressPercentage: document.getElementById("progress-percentage"),
      searchInput: document.getElementById("searchInput"),
      refreshBtn: document.getElementById("refreshBtn"),
      totalItems: document.getElementById("totalItems"),
      totalImages: document.getElementById("totalImages"),
      totalVideos: document.getElementById("totalVideos"),
      displayArea: document.getElementById("display-area"),
      previewContainer: document.querySelector(
        "#display-area .preview-container",
      ),
    };
  }

  setupEventListeners() {
    const { dropZone, fileInput, uploadButton, refreshBtn, searchInput } =
      this.elements;

    if (dropZone) {
      dropZone.addEventListener("click", () => fileInput.click());
      dropZone.addEventListener("dragover", (e) => this.handleDragOver(e));
      dropZone.addEventListener("dragleave", () => this.handleDragLeave());
      dropZone.addEventListener("drop", (e) => this.handleDrop(e));
    }

    if (fileInput)
      fileInput.addEventListener("change", (e) => this.handleFileSelect(e));
    if (uploadButton)
      uploadButton.addEventListener("click", () => this.uploadFiles());
    if (refreshBtn)
      refreshBtn.addEventListener("click", () => this.updateUploadedList());
    if (searchInput)
      searchInput.addEventListener("input", (e) => this.handleSearch(e));
  }

  /**
   * Consulta o back-end para carregar as propagandas catalogadas e mescla com notícias RSS
   */
  async updateUploadedList() {
    try {
      // 1. Puxa mídias enviadas localmente
      const response = await fetch("./php/list_uploads.php", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Falha ao recuperar a listagem.");
      this.uploadedItems = await response.json();
      this.renderUploadedItems();
      this.updateStats();

      // 2. Carrega as notícias em tempo real que estão ativas na TV (G1 e Jornal da Manhã)
      let activeNewsDrops = [];
      if (window.DropsEngineInstance) {
        try {
          activeNewsDrops =
            await window.DropsEngineInstance.fetchAndProcessDrops();
        } catch (err) {
          console.warn(
            "DropsEngine indisponível para o admin no momento:",
            err.message,
          );
        }
      }

      // 3. Renderiza a grade visualizadora de Drops ativos abaixo da de uploads
      this.renderActiveDropsGrid(activeNewsDrops);

      // 4. Constrói a fila mesclada de transmissão exata (2 locais + 1 drop) para rodar no preview
      const combinedQueue = [];
      let localIdx = 0;
      let newsIdx = 0;

      while (
        localIdx < this.uploadedItems.length ||
        newsIdx < activeNewsDrops.length
      ) {
        for (let k = 0; k < 2 && localIdx < this.uploadedItems.length; k++) {
          combinedQueue.push(this.uploadedItems[localIdx++]);
        }
        if (newsIdx < activeNewsDrops.length) {
          combinedQueue.push(activeNewsDrops[newsIdx++]);
        }
      }

      if (combinedQueue.length === 0) {
        combinedQueue.push(...this.uploadedItems);
      }

      const { displayArea } = this.elements;
      if (displayArea) {
        if (combinedQueue.length > 0) {
          displayArea.classList.remove("d-none");
          if (window.startSlideshow) {
            window.startSlideshow(combinedQueue);
          }
        } else {
          displayArea.classList.add("d-none");
        }
      }
    } catch (error) {
      console.error("Erro no carregamento de uploads:", error);
      this.showFeedback(
        "Não foi possível carregar a listagem de arquivos.",
        "danger",
      );
    }
  }

  /**
   * Renderiza a listagem de notícias reais monitoradas (Drops da Indústria) abaixo da listagem de uploads
   */
  renderActiveDropsGrid(newsDrops) {
    let dropsCard = document.getElementById("admin-drops-card");
    if (!dropsCard) {
      dropsCard = document.createElement("section");
      dropsCard.id = "admin-drops-card";
      dropsCard.className = "card border-0 shadow-sm mt-4";

      // Insere o card de Drops logo após o card padrão de "Itens Carregados"
      const uploadedCard = this.elements.uploadedList.closest(".card");
      if (uploadedCard) {
        uploadedCard.parentNode.insertBefore(
          dropsCard,
          uploadedCard.nextSibling,
        );
      }
    }

    if (newsDrops.length === 0) {
      dropsCard.innerHTML = `
        <div class="card-header bg-white py-3 border-0">
          <h5 class="mb-0 fw-semibold text-secondary"><i class="fas fa-bolt me-2 text-warning"></i>Notícias em Tempo Real Ativas</h5>
        </div>
        <div class="card-body p-4 text-center text-muted">
          <i class="fas fa-unlink fa-2x mb-2 text-warning"></i>
          <p class="mb-0 small">Aguardando conexão com os feeds de notícias do Jornal da Manhã e G1...</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
        <h5 class="mb-0 fw-semibold text-secondary">
          <i class="fas fa-bolt me-2 text-warning animate-pulse"></i>Fila de Drops da Indústria (Filtro Ativo em Tempo Real)
        </h5>
        <span class="badge bg-primary rounded-pill">${newsDrops.length} Slides</span>
      </div>
      <div class="card-body p-4">
        <p class="text-muted small mb-4">Abaixo estão listadas as notícias capturadas automaticamente do <strong>Jornal da Manhã de Uberaba</strong> e dos portais do <strong>G1</strong>. Elas são injetadas em tempo real na TV da recepção.</p>
        <div class="row g-3">
    `;

    newsDrops.forEach((item) => {
      const isVideo = item.hasVideo && item.video;
      const mediaHtml = isVideo
        ? `<video class="img-fluid rounded" style="height: 100px; width: 100%; object-fit: cover;" muted preload="metadata"><source src="${item.video}#t=0.5" type="video/mp4"></video>`
        : item.image
          ? `<img src="${item.image}" alt="Notícia" class="img-fluid rounded" style="height: 100px; width: 100%; object-fit: cover;">`
          : `<div class="d-flex align-items-center justify-content-center bg-light rounded" style="height: 100px; width: 100%;"><i class="fas fa-newspaper fa-2x text-muted"></i></div>`;

      html += `
        <div class="col-12 col-xl-6">
          <div class="p-3 border rounded bg-light d-flex gap-3 h-100">
            <div style="width: 120px; flex-shrink: 0;" class="position-relative">
              ${mediaHtml}
              ${isVideo ? '<span class="badge bg-dark position-absolute bottom-0 start-0 m-1" style="font-size:0.6rem;"><i class="fas fa-video"></i> Vídeo</span>' : ""}
            </div>
            <div class="flex-grow-1" style="min-width: 0;">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge bg-secondary" style="font-size: 0.7rem;">${item.category}</span>
                <span class="text-muted" style="font-size: 0.7rem;">${item.pubDate}</span>
              </div>
              <h6 class="text-dark fw-bold text-truncate mb-1" style="font-size: 0.85rem;" title="${item.title}">${item.title}</h6>
              <p class="text-muted mb-0 text-truncate" style="font-size: 0.75rem;">${item.summary}</p>
              <div class="text-end mt-2" style="font-size: 0.7rem;">
                <span class="text-primary fw-semibold"><i class="fas fa-globe me-1"></i>${item.source}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
    dropsCard.innerHTML = html;
  }

  renderUploadedItems(items = this.uploadedItems) {
    const { uploadedList } = this.elements;
    if (!uploadedList) return;

    uploadedList.innerHTML = items.length ? "" : this.getEmptyStateHTML();

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "col-12 col-md-6 col-lg-4 d-flex align-items-stretch";

      const itemElement = document.createElement("div");
      itemElement.className = "media-item w-100 d-flex flex-column";
      itemElement.innerHTML = this.getMediaItemHTML(item);

      if (item.type === "image") {
        const input = itemElement.querySelector("input");
        const saveBtn = itemElement.querySelector(".save-btn");
        if (saveBtn && input) {
          saveBtn.addEventListener("click", () =>
            this.updateTime(item.id, input.value),
          );
        }
      }

      const deleteBtn = itemElement.querySelector(".delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => this.deleteItem(item.id));
      }

      card.appendChild(itemElement);
      uploadedList.appendChild(card);
    });
  }

  getMediaItemHTML(item) {
    const isImage = item.type === "image";
    const badgeColor = isImage ? "success" : "info";
    const badgeText = isImage ? "Imagem" : "Vídeo";

    const previewContent = isImage
      ? `<img src="./uploads/photos/${item.file}" alt="${item.file}" class="img-fluid rounded">
         <div class="media-type-icon"><i class="fas fa-image"></i></div>`
      : `<video class="img-fluid rounded" muted preload="metadata">
            <source src="./uploads/videos/${item.file}#t=0.5" type="video/mp4">
         </video>
         <div class="media-type-icon"><i class="fas fa-video"></i></div>`;

    const actionsContent = isImage
      ? `<div class="d-flex align-items-center justify-content-between gap-2 mt-auto">
          <div class="input-group input-group-sm" style="max-width: 140px;">
            <input type="number" class="form-control" value="${item.display_time || 5}" min="1" max="60">
            <span class="input-group-text">s</span>
          </div>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-success save-btn" title="Salvar alteração de tempo"><i class="fas fa-check"></i></button>
            <button class="btn btn-sm btn-outline-danger delete-btn" title="Remover mídia"><i class="fas fa-trash"></i></button>
          </div>
         </div>`
      : `<div class="d-flex justify-content-end gap-1 mt-auto">
          <button class="btn btn-sm btn-outline-danger delete-btn w-100" title="Remover mídia"><i class="fas fa-trash me-2"></i>Excluir Vídeo</button>
         </div>`;

    return `
      <div class="media-preview">
        ${previewContent}
      </div>
      <div class="media-info d-flex flex-column flex-grow-1 p-3">
        <h6 class="media-title text-truncate mb-2" title="${item.file}">${item.file}</h6>
        <div class="media-meta mb-3 d-flex align-items-center justify-content-between">
          <span class="badge bg-${badgeColor}">${badgeText}</span>
          <span class="text-muted small">${new Date(item.uploaded_at).toLocaleDateString("pt-BR")}</span>
        </div>
        ${actionsContent}
      </div>
    `;
  }

  getEmptyStateHTML() {
    return `
      <div class="col-12 text-center py-5">
        <div class="p-4 bg-light rounded d-inline-block">
          <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
          <h5 class="text-secondary">Nenhuma campanha cadastrada</h5>
          <p class="text-muted mb-0">Arraste seus arquivos para a zona de upload acima para começar.</p>
        </div>
      </div>
    `;
  }

  updateStats() {
    const { totalItems, totalImages, totalVideos } = this.elements;
    if (!totalItems || !totalImages || !totalVideos) return;

    const total = this.uploadedItems.length;
    const images = this.uploadedItems.filter(
      (item) => item.type === "image",
    ).length;

    totalItems.textContent = total;
    totalImages.textContent = images;
    totalVideos.textContent = total - images;
  }

  async uploadFiles() {
    if (this.selectedFiles.length === 0) {
      return this.showFeedback(
        "Escolha pelo menos uma mídia para realizar o upload.",
        "warning",
      );
    }

    const formData = new FormData();
    this.selectedFiles.forEach((file) => formData.append("files[]", file));

    this.showProgress();

    try {
      const responseText = await this.sendUploadRequest(formData);
      const data = JSON.parse(responseText);

      if (data.success) {
        this.showFeedback("Mídias publicadas com sucesso!", "success");
        this.resetFileSelection();
        await this.updateUploadedList();
      } else {
        this.showFeedback(data.message || "Erro no envio de mídia.", "danger");
      }
    } catch (error) {
      this.showFeedback(
        "Ocorreu um erro ao despachar o upload ao servidor.",
        "danger",
      );
      console.error("Upload error:", error);
    } finally {
      this.hideProgress();
    }
  }

  sendUploadRequest(formData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "./php/upload.php");

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          this.updateProgress(percentComplete);
        }
      });

      xhr.onload = () =>
        xhr.status === 200 ? resolve(xhr.responseText) : reject(xhr.statusText);
      xhr.onerror = () => reject("Falha de rede na comunicação.");
      xhr.send(formData);
    });
  }

  async updateTime(itemId, newTime) {
    if (!newTime || isNaN(newTime) || newTime < 1) {
      return this.showFeedback(
        "Especifique um tempo válido em segundos.",
        "warning",
      );
    }

    try {
      const response = await fetch("./php/update_time.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, display_time: newTime }),
      });

      const data = await response.json();
      if (data.success) {
        this.showFeedback("Tempo de exibição ajustado com sucesso.", "success");
        this.updateUploadedList();
      } else {
        this.showFeedback(
          data.message || "Não foi possível atualizar o tempo.",
          "danger",
        );
      }
    } catch (error) {
      console.error("Erro ao configurar tempo:", error);
      this.showFeedback("Erro interno ao salvar temporização.", "danger");
    }
  }

  async deleteItem(id) {
    if (
      !confirm("Confirmar remoção permanente desta campanha? Ela sairá do ar.")
    )
      return;

    try {
      const response = await fetch("./php/delete_item.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      if (data.success) {
        this.showFeedback("Mídia excluída com sucesso.", "success");
        this.updateUploadedList();
      } else {
        this.showFeedback(
          data.message || "Não foi possível excluir a mídia.",
          "danger",
        );
      }
    } catch (error) {
      console.error("Erro de exclusão:", error);
      this.showFeedback("Erro interno ao solicitar exclusão.", "danger");
    }
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    this.processFiles(files);
    event.target.value = "";
  }

  handleDragOver(event) {
    event.preventDefault();
    this.elements.dropZone.classList.add("dragging");
  }

  handleDragLeave() {
    this.elements.dropZone.classList.remove("dragging");
  }

  handleDrop(event) {
    event.preventDefault();
    this.elements.dropZone.classList.remove("dragging");
    const files = Array.from(event.dataTransfer.files);
    this.processFiles(files);
  }

  processFiles(files) {
    if (files.length === 0) return;

    const { validFiles, invalidFiles } = this.validateFiles(files);

    if (invalidFiles.length > 0) {
      this.showFeedback(
        `Omissões de arquivos incompatíveis: ${invalidFiles.join(", ")}.`,
        "warning",
      );
    }

    if (validFiles.length > 0) {
      this.addFilesToSelection(validFiles);
    }
  }

  validateFiles(files) {
    const validFiles = [];
    const invalidFiles = [];
    let cumulativeSize = 0;

    files.forEach((file) => {
      if (!this.allowedTypes.includes(file.type)) {
        invalidFiles.push(`${file.name} (Formato inválido)`);
        return;
      }

      cumulativeSize += file.size;

      if (!this.isFileAlreadySelected(file)) {
        validFiles.push(file);
      }
    });

    if (cumulativeSize > this.MAX_UPLOAD_SIZE) {
      return {
        validFiles: [],
        invalidFiles: [
          `Lote excede teto de 500MB (${this.formatFileSize(cumulativeSize)})`,
        ],
      };
    }

    return { validFiles, invalidFiles };
  }

  isFileAlreadySelected(file) {
    return this.selectedFiles.some(
      (f) =>
        f.name === file.name &&
        f.size === file.size &&
        f.lastModified === file.lastModified,
    );
  }

  addFilesToSelection(files) {
    files.forEach((file) => {
      this.selectedFiles.push(file);
      this.createFilePreview(file);
    });
  }

  createFilePreview(file) {
    const fileItem = document.createElement("div");
    fileItem.className =
      "file-item d-flex align-items-center justify-content-between p-2 mb-2 border rounded bg-white fade-in";
    fileItem.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <i class="fas ${this.getFileIcon(file.type)} fs-4 text-primary"></i>
        <div>
          <div class="file-name fw-semibold text-truncate" style="max-width: 250px;">${file.name}</div>
          <div class="file-size text-muted small">${this.formatFileSize(file.size)}</div>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-danger cancel-btn">
        <i class="fas fa-times"></i>
      </button>
    `;

    fileItem.querySelector(".cancel-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      this.removeFileFromSelection(file, fileItem);
    });

    this.elements.filePreviewList.appendChild(fileItem);
  }

  removeFileFromSelection(file, fileItem) {
    fileItem.remove();
    this.selectedFiles = this.selectedFiles.filter((f) => f !== file);
  }

  resetFileSelection() {
    this.selectedFiles = [];
    this.elements.filePreviewList.innerHTML = "";
  }

  handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredItems = this.uploadedItems.filter((item) =>
      item.file.toLowerCase().includes(searchTerm),
    );
    this.renderUploadedItems(filteredItems);
  }

  showProgress() {
    this.elements.progressContainer.classList.remove("d-none");
    this.updateProgress(0);
  }

  updateProgress(percent) {
    this.elements.progressBar.style.width = `${percent}%`;
    this.elements.progressPercentage.textContent = `${percent}%`;
  }

  hideProgress() {
    this.elements.progressContainer.classList.add("d-none");
  }

  showFeedback(message, type) {
    const { feedbackMessage } = this.elements;
    if (!feedbackMessage) return;

    feedbackMessage.textContent = message;
    feedbackMessage.className = `alert alert-${type} fade-in mb-3 d-block`;

    setTimeout(() => {
      feedbackMessage.classList.add("d-none");
    }, 6000);
  }

  getFileIcon(type) {
    if (type.startsWith("image/")) return "fa-file-image";
    if (type.startsWith("video/")) return "fa-file-video";
    return "fa-file";
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new MediaManager();
});
