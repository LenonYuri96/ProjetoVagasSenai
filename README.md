# 💼 ProjetoVagasSenai — Mural Digital & Gestão de Mídias Institucionais

> **Plataforma corporativa de Digital Signage para divulgação de vagas de emprego, campanhas de marketing institucional e agregação de notícias em tempo real para totens e TVs do SENAI Uberaba e FIEMG Regional Vale do Rio Grande.**

🔗 **Repositório Oficial:** [github.com/LYuri26/ProjetoVagasSenai](https://github.com/LYuri26/ProjetoVagasSenai)

---

![PHP](https://img.shields.io/badge/PHP-7.4%20%7C%208.x-777BB4?style=for-the-badge&logo=php&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-Compatible-C51A4A?style=for-the-badge&logo=raspberry-pi&logoColor=white)

---

## 📌 Sumário
- [📖 Sobre o Projeto](#-sobre-o-projeto)
- [🎯 Principais Funcionalidades](#-principais-funcionalidades)
- [🏛️ Arquitetura e Fluxo de Transmissão](#️-arquitetura-e-fluxo-de-transmissão)
- [📂 Estrutura de Diretórios](#-estrutura-de-diretórios)
- [⚙️ Requisitos do Sistema](#️-requisitos-do-sistema)
- [🚀 Como Instalar e Executar](#-como-instalar-e-executar)
- [🧩 Módulos do Sistema](#-módulos-do-sistema)
  - [1. Portal de Acesso (`index.php`)](#1-portal-de-acesso-indexphp)
  - [2. Painel de Exibição TV/Totem (`user/`)](#2-painel-de-exibição-tvtotem-user)
  - [3. Painel Administrativo (`admin/`)](#3-painel-administrativo-admin)
  - [4. Motor DropsEngine & Backend Feed](#4-motor-dropsengine--backend-feed)
- [🛠️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [🔒 Segurança e Boas Práticas](#-segurança-e-boas-práticas)
- [👨‍🏫 Autor](#-autor)

---

## 📖 Sobre o Projeto

O **ProjetoVagasSenai** é uma solução completa desenvolvida para centralizar a comunicação visual das unidades do SENAI. Operando como um **Mural Eletrônico Inteligente (Digital Signage)**, a plataforma transmite em carrossel contínuo anúncios de vagas de emprego, cursos técnicos, campanhas institucionais e notícias automatizadas em tempo real (**Drops da Indústria**), consumidas de fontes como G1 Triângulo Mineiro, Portal da Indústria, FIEMG e redes sociais.

O sistema foi arquitetado para operar com **estabilidade ininterrupta (24/7)** em totens de atendimento, Smart TVs e microcomputadores **Raspberry Pi**, com suporte tanto a ambientes com internet ativa quanto em redes fechadas/offline.

---

## 🎯 Principais Funcionalidades

- 📌 **Divulgação de Oportunidades & Vagas:** Exibição dinâmica de cartazes, banners e comunicados institucionais.
- 📤 **Upload em Lote com Drag & Drop:** Envio facilitado de imagens (JPG, PNG, GIF) e vídeos (MP4, WebM) de até 500MB com barra de progresso em tempo real.
- ⏱️ **Temporização Individualizada:** Controle de tempo de exibição independente por imagem (em segundos), armazenado em banco de dados / JSON.
- 🎬 **Gestão Fluida de Vídeos:** Reprodução automática de vídeos em tela cheia com avanço programado após o término da mídia.
- ⚡ **Drops da Indústria (Feeds em Tempo Real):** Agregador inteligente em PHP com cache de 5 minutos, trazendo novidades de Uberaba, Minas Gerais e indústria sem risco de bloqueios por CORS.
- 🛡️ **Tolerância a Falhas e Modo Offline:** Em caso de perda de sinal de internet, o mural ativa automaticamente uma base de contingência local e continua a exibição das mídias sem travar.
- 🔒 **Painel Administrativo Autenticado:** Acesso restrito protegido por sessão PHP nativa e modal com validação assíncrona.
- 🌐 **Roteamento Agnóstico à Pasta:** Compatível nativamente na raiz do servidor (`http://localhost:3000/`), em subpastas (`http://ip/Totem/`) ou em Raspberry Pi.
- 🔄 **Mecanismo Anti-Cache:** Versionamento automático de CSS e JavaScript via timestamp (`filemtime`), forçando a atualização instantânea nas TVs sempre que um novo arquivo for publicado.

---

## 🏛️ Arquitetura e Fluxo de Transmissão

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PORTAL PRINCIPAL (index.php)                    │
│      ├──► Acesso Direto à TV / Totem                                   │
│      └──► Modal Autenticado com Senha Administrativa                   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│     PAINEL DE EXIBIÇÃO (user/)       │ │   PAINEL DE CONTROLE (admin/) │
│  (Mural Contínuo para Recepção/TV)   │ │  - Upload Drag & Drop (500MB) │
│                                      │ │  - Ajuste de Tempo por Slide  │
│  Alternância Automática:             │ │  - Exclusão em 1 clique       │
│  ├── 2x Mídias Locais (Fotos/Vídeos) │ │  - Métricas e Contadores      │
│  └── 1x Notícia (Drops da Indústria) │ │  - Preview com Singleton JS   │
└──────────────────▲───────────────────┘ └───────────────┬───────────────┘
                   │                                     │
                   └──────────── [ uploads/ ] ───────────┘
                                 [ db / get_drops.php ]
```

---

## 📂 Estrutura de Diretórios

```text
ProjetoVagasSenai/
│
├── config.js                     # Núcleo de detecção de rotas base e limpeza de cache
├── index.php                     # Portal inicial de acesso e modal de login
├── index.css                     # Estilização visual da tela inicial
├── index.js                      # Lógica do relógio e autenticação assíncrona
│
├── admin/                        # Módulo Administrativo
│   ├── indexadminsenai.php       # Dashboard de controle, métricas e upload
│   ├── css/
│   │   └── indexadmin.css        # Estilos do painel de administração
│   ├── images/
│   │   ├── senai-logo-0.png      # Logo oficial SENAI
│   │   └── favicon.ico           # Favicon do sistema
│   ├── js/
│   │   ├── indexadmin.js         # Singleton AdminSlideshow para preview interativo
│   │   └── upload.js             # Gerenciador de uploads, progresso e listagem
│   └── php/
│       ├── auth_check.php        # Validador de sessão ativa (Server-Side)
│       ├── db.php                # Inicialização e persistência de dados
│       ├── delete_item.php       # Endpoint para remoção de mídias
│       ├── get_drops.php         # Agregador de feeds de notícias com cache de 5 min
│       ├── list_uploads.php      # Listagem de mídias em formato JSON
│       ├── login.php             # Processamento de autenticação administrativa
│       ├── logout.php            # Encerramento de sessão
│       ├── session_config.php    # Configuração de cookies e segurança de sessão
│       ├── update_time.php       # Atualização de temporização do slide
│       └── upload.php            # Processamento de uploads de arquivos
│
├── uploads/                      # Armazenamento persistente de mídias
│   ├── photos/                   # Imagens publicadas
│   └── videos/                   # Vídeos publicados
│
└── user/                         # Módulo de Exibição Pública (TV / Totem)
    ├── indexuser.html            # Tela principal de transmissão contínua
    ├── css/
    │   └── user.css              # Layout otimizado para telas Full HD / 4K
    └── js/
        ├── drops.js              # DropsEngine (Agregação, filtros e contingência)
        └── indexuser.js          # Orquestrador do carrossel da TV
```

---

## ⚙️ Requisitos do Sistema

- **Servidor Web:** Apache 2.4+ / Nginx / Servidor Embutido do PHP
- **PHP:** Versão 7.4 ou superior (Totalmente compatível com PHP 8.x)
- **Extensões PHP Recomendadas:**
  - `php-curl` (necessário para consulta de feeds e notícias)
  - `php-xml` / `php-simplexml` (processamento de feeds RSS)
  - `php-pdo` / `php-sqlite3` ou `php-mysqli`
  - `php-mbstring`
  - `php-json`
- **Hardware de Exibição:** Smart TV, Computador Desktop ou **Raspberry Pi** (3B+, 4 ou superior com navegador Chromium em modo Kiosk).

---

## 🚀 Como Instalar e Executar

### 1. Clonar o Repositório
```bash
git clone https://github.com/LYuri26/ProjetoVagasSenai.git
cd ProjetoVagasSenai
```

### 2. Permissões de Pastas (Servidores Linux / Raspberry Pi)
Conceda permissões de escrita para as pastas de mídia e cache:
```bash
chmod -R 775 uploads/
chmod -R 775 admin/php/
```

### 3. Ajuste de Limites do PHP (`php.ini`)
Para permitir uploads de vídeos pesados de alta definição, ajuste no seu `php.ini`:
```ini
upload_max_filesize = 500M
post_max_size = 500M
max_execution_time = 300
max_input_time = 300
memory_limit = 512M
```

### 4. Executar Localmente
Para testar utilizando o servidor integrado do PHP:
```bash
php -S localhost:3000
```
Acesse no seu navegador: `http://localhost:3000`

---

## 🧩 Módulos do Sistema

### 1. Portal de Acesso (`index.php`)
Página inicial com design institucional do SENAI. Permite aos visitantes abrir a visualização da TV ou aos gestores acionar o modal de senha para o Painel Administrativo.

### 2. Painel de Exibição TV/Totem (`user/`)
Projetado para telas grandes com reprodução contínua e sem necessidade de interação humana.
- Alterna automaticamente 2 mídias locais com 1 card do *Drops da Indústria*.
- Sincronização em segundo plano sem recarregar a tela.

### 3. Painel Administrativo (`admin/`)
Dashboard completo para os gestores de comunicação:
- **Estatísticas Rápidas:** Contador de mídias totais, fotos e vídeos cadastrados.
- **Preview em Tempo Real:** Visualização idêntica à tela da recepção via padrão *Singleton* (`AdminSlideshow`).
- **Ajuste de Segundos:** Configuração individual de tempo de exibição para cada anúncio de vaga.

### 4. Motor DropsEngine & Backend Feed (`get_drops.php` & `drops.js`)
- Agrega notícias e postagens do G1 Triângulo Mineiro, Google News, FIEMG e redes sociais.
- Realiza deduplicação semântica e filtragem de termos irrelevantes.
- Organiza o carrossel de forma equilibrada entre categorias (*SENAI Uberaba*, *FIEMG Regional Vale do Rio Grande*, *SENAI Nacional*, *LinkedIn FIEMG*).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:**
  - HTML5 Semântico
  - CSS3 (CSS Grid, Flexbox, Keyframes e Transições Suaves)
  - JavaScript Vanilla Moderno (ES6+, Classes, Async/Await, AbortController, Fetch API)
  - [Bootstrap 5.3](https://getbootstrap.com/)
  - [Font Awesome 6](https://fontawesome.com/)
  - [Google Fonts (Inter)](https://fonts.google.com/specimen/Inter)
- **Backend:**
  - PHP (cURL, SimpleXML, Manipulação de Arquivos e Sessões Nativas)
  - SQLite / PDO / JSON Storage

---

## 🔒 Segurança e Boas Práticas

- **Proteção de Sessão:** Verificação centralizada via `session_config.php` e `auth_check.php` em todos os endpoints administrativos.
- **Validação de Uploads:** Validação rigorosa de extensões e tipos MIME (`image/jpeg`, `image/png`, `video/mp4`, `video/webm`).
- **Resiliência de Rede:** Timeout controlado em chamadas de API externas para evitar que instabilidades em serviços de terceiros congelem o painel de exibição.

---

## 👨‍🏫 Autor

<table align="center">
  <tr>
    <td align="center">
      <img src="https://github.com/LYuri26.png" width="120px;" style="border-radius: 50%;" alt="Foto do Autor"/><br />
      <sub><b>Lenon Yuri (LYuri26)</b></sub><br />
      <sub><i>Professor de Desenvolvimento de Sistemas</i></sub>
    </td>
  </tr>
</table>

### 🎓 Formações Acadêmicas:
- **Técnico em Informática** – Escola Estadual Professor Guerino Casassanta
- **Bacharel em Sistemas de Informação** – Universidade Estácio de Sá
- **Bacharel em Administração** – Instituto Federal de Minas Gerais (IFMG)
- **Licenciado em Computação** – Instituto Federal do Triângulo Mineiro (IFTM)

---

<div align="center">
  <sub>SENAI - Serviço Nacional de Aprendizagem Industrial | FIEMG Regional Vale do Rio Grande</sub><br>
  <sub><b>Pelo Futuro do Trabalho</b></sub>
</div>
