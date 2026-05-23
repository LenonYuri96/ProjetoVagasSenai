// Função para atualizar o relógio
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const timeString = `${hours}:${minutes}:${seconds}`;
  document.getElementById("clock").textContent = timeString;
}

// Atualiza o relógio a cada segundo
setInterval(updateClock, 1000);
updateClock();

// Atualiza o ano no rodapé
document.getElementById("current-year").textContent = new Date().getFullYear();
