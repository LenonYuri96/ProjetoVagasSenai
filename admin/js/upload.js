class MediaManager {
  constructor() {
    this.selectedFiles = [];
    this.uploadedItems = [];
    this.MAX_UPLOAD_SIZE = 500 * 1024 * 1024;
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
      // Adicionando o previewContainer diretamente nos elementos
      previewContainer: document.querySelector(
        "#display-area .preview-container"
      ),
    };
  }

  setupEventListeners() {
    const { dropZone, fileInput, uploadButton, refreshBtn, searchInput } =
      this.elements;

    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => this.handleDragOver(e));
    dropZone.addEventListener("dragleave", () => this.handleDragLeave());
    dropZone.addEventListener("drop", (e) => this.handleDrop(e));
    fileInput.addEventListener("change", (e) => this.handleFileSelect(e));
    uploadButton.addEventListener("click", () => this.uploadFiles());
    refreshBtn.addEventListener("click", () => this.updateUploadedList());
    searchInput.addEventListener("input", (e) => this.handleSearch(e));
  }

  async updateUploadedList() {
    try {
      const response = await fetch("./php/list_uploads.php");
      this.uploadedItems = await response.json();
      this.renderUploadedItems();
      this.updateStats();

      if (this.uploadedItems.length > 0) {
        this.elements.displayArea.classList.remove("d-none");
        if (window.startSlideshow) {
          startSlideshow(this.uploadedItems);
        }
      } else {
        this.elements.displayArea.classList.add("d-none");
      }
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      this.showFeedback("Erro ao carregar itens. Tente novamente.", "danger");
    }
  }

  renderUploadedItems(items = this.uploadedItems) {
    const { uploadedList } = this.elements;
    uploadedList.innerHTML = items.length ? "" : this.getEmptyStateHTML();

    items.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.className = "media-item";
      itemElement.innerHTML = this.getMediaItemHTML(item);

      if (item.type === "image") {
        const input = itemElement.querySelector("input");
        itemElement.querySelector(".save-btn").addEventListener("click", () => {
          this.updateTime(item.id, input.value);
        });
      }

      itemElement.querySelector(".delete-btn").addEventListener("click", () => {
        this.deleteItem(item.id);
      });
      uploadedList.appendChild(itemElement);
    });
  }

  getMediaItemHTML(item) {
    const previewContent =
      item.type === "image"
        ? `
          <img src="./uploads/photos/${item.file}" alt="${item.file}" class="img-fluid">
          <div class="media-type-icon">
            <i class="fas fa-image"></i>
          </div>
        `
        : `
          <video class="img-fluid" controls>
            <source src="./uploads/videos/${item.file}" type="video/mp4">
          </video>
          <div class="media-type-icon">
            <i class="fas fa-video"></i>
          </div>
        `;

    const actionsContent =
      item.type === "image"
        ? `
        <div class="time-input">
          <input type="number" class="form-control form-control-sm" 
                 value="${item.display_time || 5}" min="1" max="60">
          <span class="text-muted small ms-1">segundos</span>
        </div>
        <div class="action-buttons">
          <button class="btn btn-sm btn-success save-btn">
            <i class="fas fa-save"></i>
          </button>
          <button class="btn btn-sm btn-danger delete-btn">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `
        : `
        <div class="action-buttons w-100">
          <button class="btn btn-sm btn-danger delete-btn">
            <i class="fas fa-trash"></i> Excluir
          </button>
        </div>
      `;

    return `
      <div class="media-preview">
        ${previewContent}
      </div>
      <div class="media-info">
        <h6 class="media-title">${item.file}</h6>
        <div class="media-meta">
          <span class="badge bg-${
            item.type === "image" ? "success" : "info"
          } me-2">
            ${item.type === "image" ? "Imagem" : "Vídeo"}
          </span>
          <span class="text-muted small">
            ${new Date(item.uploaded_at).toLocaleDateString()}
          </span>
        </div>
        <div class="media-actions mt-2">
          ${actionsContent}
        </div>
      </div>
    `;
  }

  getEmptyStateHTML() {
    return `
      <div class="col-12 text-center py-5">
        <i class="fas fa-folder-open fa-3x text-muted mb-3"></i>
        <h5 class="text-muted">Nenhum item encontrado</h5>
        <p class="text-muted">Faça upload de arquivos para começar</p>
      </div>
    `;
  }

  updateStats() {
    const { totalItems, totalImages, totalVideos } = this.elements;
    const total = this.uploadedItems.length;
    const images = this.uploadedItems.filter(
      (item) => item.type === "image"
    ).length;

    totalItems.textContent = total;
    totalImages.textContent = images;
    totalVideos.textContent = total - images;
  }

  async uploadFiles() {
    if (this.selectedFiles.length === 0) {
      return this.showFeedback(
        "Nenhum arquivo selecionado para upload!",
        "warning"
      );
    }

    const formData = new FormData();
    this.selectedFiles.forEach((file) => formData.append("files[]", file));

    this.showProgress();

    try {
      const response = await this.sendUploadRequest(formData);
      const data = JSON.parse(response);

      if (data.success) {
        this.showFeedback("Upload realizado com sucesso!", "success");
        this.resetFileSelection();
        await this.updateUploadedList();
      } else {
        this.showFeedback(data.message || "Falha no upload", "danger");
      }
    } catch (error) {
      this.showFeedback("Erro ao enviar o upload", "danger");
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
      xhr.onerror = () => reject("Erro de conexão");
      xhr.send(formData);
    });
  }

  async updateTime(itemId, newTime) {
    if (!newTime || isNaN(newTime)) {
      return this.showFeedback("Por favor, insira um tempo válido", "warning");
    }

    try {
      const response = await fetch("./php/update_time.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, display_time: newTime }),
      });

      const data = await response.json();

      if (data.success) {
        this.showFeedback(
          "Tempo de exibição atualizado com sucesso!",
          "success"
        );
        this.updateUploadedList();
      } else {
        this.showFeedback(data.message || "Erro ao atualizar tempo", "danger");
      }
    } catch (error) {
      console.error("Erro ao atualizar tempo:", error);
      this.showFeedback("Erro ao atualizar tempo de exibição", "danger");
    }
  }

  async deleteItem(id) {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    try {
      const response = await fetch("./php/delete_item.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (data.success) {
        this.showFeedback("Item excluído com sucesso!", "success");
        this.updateUploadedList();
      } else {
        this.showFeedback(data.message || "Erro ao excluir item", "danger");
      }
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      this.showFeedback("Erro ao excluir item", "danger");
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
        `Limitações: ${invalidFiles.join(
          ", "
        )}. Formatos suportados: JPG, PNG, GIF, MP4, WEBM, MOV. Limite total por upload: 500MB.`,
        "warning"
      );
    }

    if (validFiles.length > 0) {
      this.addFilesToSelection(validFiles);
      this.showFeedback(
        `${validFiles.length} arquivo(s) selecionado(s) - ${this.formatFileSize(
          validFiles.reduce((sum, file) => sum + file.size, 0)
        )}`,
        "success"
      );
    }
  }

  validateFiles(files) {
    const validFiles = [];
    const invalidFiles = [];
    let totalSize = 0;

    files.forEach((file) => {
      if (!this.allowedTypes.includes(file.type)) {
        invalidFiles.push(`${file.name} (tipo não suportado)`);
        return;
      }

      totalSize += file.size;

      if (!this.isFileAlreadySelected(file)) {
        validFiles.push(file);
      }
    });

    // Verifica o tamanho total do upload
    if (totalSize > this.MAX_UPLOAD_SIZE) {
      return {
        validFiles: [],
        invalidFiles: [
          `O upload total excede 500MB (${this.formatFileSize(totalSize)})`,
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
        f.lastModified === file.lastModified
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
    fileItem.className = "file-item";
    fileItem.innerHTML = `
      <i class="fas ${this.getFileIcon(file.type)} file-icon"></i>
      <div class="file-name">${file.name}</div>
      <div class="file-size">${this.formatFileSize(file.size)}</div>
      <button class="btn btn-sm btn-outline-danger cancel-btn">
        <i class="fas fa-times me-1"></i> Remover
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

  previewItem(item) {
    const previewContainer =
      this.elements.displayArea.querySelector(".preview-container");
    previewContainer.innerHTML = "";

    const mediaWrapper = document.createElement("div");
    mediaWrapper.className = "media-wrapper text-center";

    const mediaElement =
      item.type === "image"
        ? document.createElement("img")
        : document.createElement("video");

    mediaElement.src = `./uploads/${
      item.type === "image" ? "photos" : "videos"
    }/${item.file}`;
    mediaElement.className = "preview-media";
    mediaElement.alt = item.file;

    if (item.type === "video") {
      mediaElement.controls = true;
      mediaElement.autoplay = true;
      mediaElement.muted = true; // Começa mudo para evitar problemas de autoplay
    }

    // Adiciona ícone do tipo de mídia
    const typeIcon = document.createElement("div");
    typeIcon.className = "media-type-icon-large";
    typeIcon.innerHTML = `<i class="fas ${
      item.type === "image" ? "fa-image" : "fa-video"
    }"></i>`;

    mediaWrapper.appendChild(mediaElement);
    mediaWrapper.appendChild(typeIcon);
    previewContainer.appendChild(mediaWrapper);

    this.elements.displayArea.classList.remove("d-none");
    this.elements.displayArea.scrollIntoView({ behavior: "smooth" });
  }

  handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredItems = this.uploadedItems.filter((item) =>
      item.file.toLowerCase().includes(searchTerm)
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
    feedbackMessage.textContent = message;
    feedbackMessage.className = `alert alert-${type}`;
    feedbackMessage.classList.remove("d-none");

    setTimeout(() => {
      feedbackMessage.classList.add("d-none");
    }, 5000);
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

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new MediaManager();
});
