// config.js – Centraliza a detecção da base e força limpeza de cache
(function () {
  // 1. Detecta a base dinamicamente pela URL onde o próprio config.js está hospedado
  let base = "/";
  try {
    const scriptSrc = document.currentScript ? document.currentScript.src : "";
    if (scriptSrc) {
      const url = new URL(scriptSrc);
      // Pega o diretório do config.js (ex: "/" ou "/Totem/")
      base = url.pathname.substring(0, url.pathname.lastIndexOf("/") + 1);
    }
  } catch (e) {
    console.warn(
      "[Config] Não foi possível obter URL via currentScript, usando fallback.",
    );
    const path = window.location.pathname;
    const match = path.match(/^(.*\/)(?:user|admin)?/);
    base = match ? match[1] : "/";
  }

  // Garante que a base termine com "/" (ex: "/Totem/" ou "/")
  if (!base.endsWith("/")) base += "/";
  window.PROJECT_BASE = base;

  console.log("[Config] Base detectada:", window.PROJECT_BASE);

  // 2. Função para montar URLs absolutas com base no projeto
  window.getLocalUrl = function (url) {
    if (!url) return "";
    // Se for URL externa, mantém inalterada
    if (/^(https?:|\/\/)/i.test(url)) {
      return url;
    }
    // Se já contém a base, retorna diretamente
    if (window.PROJECT_BASE !== "/" && url.startsWith(window.PROJECT_BASE)) {
      return url;
    }
    const cleanUrl = url.replace(/^\/+/, "");
    return window.PROJECT_BASE + cleanUrl;
  };

  // 3. Controle de versão e atualização de cache
  try {
    const currentScript = document.currentScript;
    if (currentScript && currentScript.src.includes("?v=")) {
      const version = currentScript.src.split("?v=")[1];
      const storedVersion = localStorage.getItem("totem_js_version");

      if (storedVersion && storedVersion !== version) {
        console.log("[Config] Nova versão detectada. Atualizando...");
        localStorage.setItem("totem_js_version", version);
        window.location.reload();
      } else if (version) {
        localStorage.setItem("totem_js_version", version);
      }
    }
  } catch (err) {
    console.error("[Config] Erro ao verificar versão do cache:", err);
  }
})();
