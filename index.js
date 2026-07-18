// Função para atualizar o relógio
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const timeString = `${hours}:${minutes}:${seconds}`;

  const clockElement = document.getElementById("clock");
  if (clockElement) {
    clockElement.textContent = timeString;
  }
}

// Atualiza o relógio a cada segundo
setInterval(updateClock, 1000);
updateClock();

// Atualiza o ano no rodapé com segurança de carregamento do DOM
document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("current-year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Lógica de verificação de senha
  const loginForm = document.getElementById("adminLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const passwordInput = document.getElementById("adminPassword");
      const errorFeedback = document.getElementById("passwordError");

      // Senha definida pelo usuário
      const correctPassword = "Senai@2026";

      if (passwordInput.value === correctPassword) {
        // Redireciona para o painel administrativo
        window.location.href = "./admin/indexadminsenai.html";
      } else {
        // Aplica efeito visual de erro
        passwordInput.classList.add("is-invalid");
        if (errorFeedback) {
          errorFeedback.style.display = "block";
        }
        passwordInput.value = "";
        passwordInput.focus();
      }
    });

    // Limpa o estado de erro ao digitar novamente
    const passwordInput = document.getElementById("adminPassword");
    passwordInput.addEventListener("input", () => {
      passwordInput.classList.remove("is-invalid");
    });
  }
});
