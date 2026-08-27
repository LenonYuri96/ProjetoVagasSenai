document.addEventListener("DOMContentLoaded", () => {
  // ===== 1. RELÓGIO =====
  function updateClock() {
    const clockElement = document.getElementById("clock");
    if (clockElement) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ===== 2. ANO NO RODAPÉ =====
  const yearElement = document.getElementById("current-year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // ===== 3. ELEMENTOS DO MODAL / LOGIN =====
  const loginForm = document.getElementById("adminLoginForm");
  const passwordInput = document.getElementById("adminPassword");
  const errorFeedback = document.getElementById("passwordError");
  const confirmBtn = document.querySelector(
    "#adminAuthModal .btn-submit-password",
  );
  const modal = document.getElementById("adminAuthModal");

  // ===== 4. FUNÇÃO DE AUTENTICAÇÃO =====
  async function autenticar() {
    if (!passwordInput) return;

    const senha = passwordInput.value.trim();
    if (!senha) {
      passwordInput.classList.add("is-invalid");
      if (errorFeedback) errorFeedback.style.display = "block";
      return;
    }

    const usuario = "admin";
    const loginUrl = window.getLocalUrl
      ? window.getLocalUrl("admin/php/login.php")
      : "admin/php/login.php";

    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const adminUrl = window.getLocalUrl
          ? window.getLocalUrl("admin/indexadminsenai.php")
          : "admin/indexadminsenai.php";
        window.location.replace(adminUrl);
      } else {
        passwordInput.classList.add("is-invalid");
        if (errorFeedback) {
          if (data.message) errorFeedback.textContent = data.message;
          errorFeedback.style.display = "block";
        }
        passwordInput.value = "";
        passwordInput.focus();
      }
    } catch (err) {
      console.error("Erro no login:", err);
      alert("Erro ao conectar com o servidor.");
    }
  }

  // ===== 5. EVENTOS DO FORMULÁRIO =====
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
      autenticar();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", (e) => {
      e.preventDefault();
      autenticar();
    });
  }

  // Limpa erro ao digitar
  if (passwordInput) {
    passwordInput.addEventListener("input", () => {
      passwordInput.classList.remove("is-invalid");
      if (errorFeedback) {
        errorFeedback.style.display = "none";
      }
    });
  }

  // Limpa campos e erros ao fechar o modal
  if (modal) {
    modal.addEventListener("hidden.bs.modal", () => {
      if (passwordInput) {
        passwordInput.value = "";
        passwordInput.classList.remove("is-invalid");
      }
      if (errorFeedback) {
        errorFeedback.style.display = "none";
      }
    });

    // Foca no campo de senha automaticamente ao abrir o modal
    modal.addEventListener("shown.bs.modal", () => {
      if (passwordInput) {
        passwordInput.focus();
      }
    });
  }
});
