<?php
require_once 'php/session_config.php';
// ============================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO (SERVER-SIDE)
// ============================================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    header('Location: ../index.php');
    exit;
}

// ============================================================
// FUNÇÃO PARA VERSIONAMENTO DE ARQUIVOS (ANTI-CACHE)
// ============================================================
function getFileVersion($file)
{
    $fullPath = __DIR__ . '/' . ltrim($file, './');
    if (file_exists($fullPath)) {
        return filemtime($fullPath);
    }
    return time();
}
?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Administração SENAI - Upload de Mídia</title>

    <!-- ============================================================ -->
    <!-- CSS COM VERSIONAMENTO ANTI-CACHE                             -->
    <!-- ============================================================ -->
    <!-- Bootstrap 5.3.2 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- CSS do Admin -->
    <link rel="stylesheet" href="./css/indexadmin.css?v=<?= getFileVersion('./css/indexadmin.css') ?>">
    <link rel="icon" href="./images/favicon.ico?v=<?= getFileVersion('./images/favicon.ico') ?>" type="image/x-icon">

    <style>
        /* ===== ESTILOS PARA DROPS CARD NO ADMIN ===== */
        .drops-card {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            background: #090d16;
            color: white;
            width: 100%;
            height: 100%;
            border-radius: 8px;
            overflow: hidden;
        }

        .drops-image-pane {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
        }

        .drops-image-pane img,
        .drops-image-pane video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .drops-image-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, rgba(9, 13, 22, 0) 60%, rgba(9, 13, 22, 1) 100%);
        }

        .drops-info-pane {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: #090d16;
            text-align: left;
        }

        .drops-badge-row {
            display: flex;
            gap: 8px;
            margin-bottom: 0.8rem;
            align-items: center;
            flex-wrap: wrap;
        }

        .drops-main-tag {
            background: linear-gradient(135deg, #045cac 0%, #00a1e4 100%);
            color: white;
            padding: 4px 10px;
            font-weight: 800;
            font-size: 0.65rem;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .drops-category-tag {
            background: rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
            padding: 4px 10px;
            font-weight: 700;
            font-size: 0.65rem;
            border-radius: 4px;
            text-transform: uppercase;
        }

        .drops-headline {
            font-size: 1.15rem;
            font-weight: 800;
            line-height: 1.3;
            color: white;
            margin-bottom: 0.8rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .drops-summary {
            font-size: 0.8rem;
            color: #94a3b8;
            line-height: 1.5;
            margin-bottom: 1rem;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .drops-source-row {
            display: flex;
            align-items: center;
            gap: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 0.8rem;
            font-size: 0.75rem;
            color: #64748b;
            margin-top: auto;
            flex-wrap: wrap;
        }

        .drops-source-badge {
            background-color: #1e293b;
            color: #cbd5e1;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
        }

        .drops-fallback-pane {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #02315d 0%, #031529 100%);
        }

        .drops-fallback-icon {
            font-size: 5rem;
            color: rgba(255, 255, 255, 0.05);
            transform: rotate(-15deg);
        }

        .fade-in {
            animation: fadeIn 0.5s ease-in-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }

        .animate-pulse {
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {

            0%,
            100% {
                opacity: 1;
            }

            50% {
                opacity: 0.5;
            }
        }

        /* ===== PREVIEW CONTAINER ===== */
        .preview-container {
            position: relative;
            width: 100%;
            height: 70vh;
            min-height: 400px;
            background: #0a0a0a;
            overflow: hidden;
        }

        /* ===== DROP ZONE ===== */
        .drop-zone {
            border: 2px dashed #dee2e6;
            border-radius: 12px;
            background: #f8f9fa;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .drop-zone.dragging {
            border-color: #0d6efd;
            background: #e9ecef;
        }

        .drop-zone:hover {
            border-color: #0d6efd;
            background: #f1f3f5;
        }

        /* ===== MEDIA ITEMS ===== */
        .media-item {
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            border: 1px solid #e9ecef;
        }

        .media-item:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.10);
        }

        .media-preview {
            position: relative;
            width: 100%;
            padding-top: 66.67%;
            background: #f1f3f5;
            overflow: hidden;
        }

        .media-preview img,
        .media-preview video {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .media-type-icon {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.6);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
        }

        .media-info {
            padding: 12px 16px;
            flex: 1;
        }

        .media-title {
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .media-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        /* ===== STAT CARDS ===== */
        .stat-card {
            border-radius: 16px;
            transition: transform 0.2s ease;
        }

        .stat-card:hover {
            transform: scale(1.02);
        }

        .bg-white-10 {
            background: rgba(255, 255, 255, 0.15);
            padding: 12px;
            border-radius: 12px;
        }

        .stat-icon-wrapper {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            color: white;
        }

        /* ===== SIDEBAR ===== */
        .sidebar {
            width: 260px;
            background: linear-gradient(180deg, #0a1628 0%, #1a1a3e 100%);
            min-height: 100vh;
            padding: 1.5rem 0;
            position: sticky;
            top: 0;
            height: 100vh;
            overflow-y: auto;
            flex-shrink: 0;
        }

        .sidebar-header {
            padding: 0 1.5rem 1.5rem 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sidebar .logo {
            max-height: 45px;
            filter: brightness(0) invert(1);
        }

        .sidebar .nav-link {
            transition: all 0.2s ease;
            font-weight: 500;
        }

        .sidebar .nav-link:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #fff !important;
        }

        .sidebar .nav-link.active {
            background: rgba(233, 69, 96, 0.2);
            color: #fff !important;
        }

        .admin-layout {
            display: flex;
            min-height: 100vh;
        }

        .main-content {
            flex: 1;
            background: #f4f6f9;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        .admin-footer {
            background: #fff;
            margin-top: auto;
        }

        .page-title {
            font-weight: 700;
            color: #0a1628;
        }

        .btn-help {
            background: #e9ecef;
            color: #495057;
            border: none;
            border-radius: 50px;
            font-weight: 600;
            transition: all 0.2s;
        }

        .btn-help:hover {
            background: #dee2e6;
        }

        .btn-light-custom {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 0.375rem 0.75rem;
            transition: all 0.2s;
        }

        .btn-light-custom:hover {
            background: #e9ecef;
        }
    </style>
</head>

<body class="admin-body">
    <div class="admin-layout">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header d-flex align-items-center justify-content-between">
                <div>
                    <img src="./images/senai-logo-0.png" alt="Logo SENAI" class="logo mb-2"
                        onerror="this.style.display='none'">
                    <h5 class="text-white opacity-75 mb-0 fw-semibold">Painel Admin</h5>
                </div>
                <!-- Logout -->
                <a href="./php/logout.php" class="btn btn-outline-light btn-sm">
                    <i class="fas fa-sign-out-alt"></i> Sair
                </a>
            </div>
            <div class="sidebar-content px-3 py-4">
                <p class="text-white-50 text-uppercase small fw-bold px-3 mb-2">Navegação</p>
                <nav class="nav flex-column">
                    <a class="nav-link active text-white rounded mb-2 py-2 px-3" href="#">
                        <i class="fas fa-images me-2"></i> Mídias
                    </a>
                    <a class="nav-link text-white-50 rounded mb-2 py-2 px-3" href="../index.php">
                        <i class="fas fa-home me-2"></i> Início
                    </a>
                </nav>
            </div>
        </aside>

        <!-- Conteúdo Principal -->
        <div class="main-content">
            <main class="container-fluid py-4">
                <header class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                    <h1 class="page-title mb-0"><i class="fas fa-images me-3"></i>Gerenciamento de Mídias</h1>
                    <button class="btn btn-help px-4" data-bs-toggle="modal" data-bs-target="#helpModal">
                        <i class="fas fa-question-circle me-2"></i>Ajuda
                    </button>
                </header>

                <!-- Cards de Estatísticas -->
                <section class="row mb-4 g-3">
                    <div class="col-12 col-md-4">
                        <div class="card stat-card border-0 bg-primary text-white h-100">
                            <div class="card-body d-flex align-items-center justify-content-between p-4">
                                <div>
                                    <h6 class="card-subtitle text-white-50 mb-1 fw-medium">Total de Itens</h6>
                                    <h3 class="card-title mb-0 fs-1 fw-bold" id="totalItems">0</h3>
                                </div>
                                <div class="stat-icon-wrapper bg-white-10">
                                    <i class="fas fa-file-alt fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4">
                        <div class="card stat-card border-0 bg-success text-white h-100">
                            <div class="card-body d-flex align-items-center justify-content-between p-4">
                                <div>
                                    <h6 class="card-subtitle text-white-50 mb-1 fw-medium">Imagens</h6>
                                    <h3 class="card-title mb-0 fs-1 fw-bold" id="totalImages">0</h3>
                                </div>
                                <div class="stat-icon-wrapper bg-white-10">
                                    <i class="fas fa-image fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4">
                        <div class="card stat-card border-0 bg-info text-white h-100">
                            <div class="card-body d-flex align-items-center justify-content-between p-4">
                                <div>
                                    <h6 class="card-subtitle text-white-50 mb-1 fw-medium">Vídeos</h6>
                                    <h3 class="card-title mb-0 fs-1 fw-bold" id="totalVideos">0</h3>
                                </div>
                                <div class="stat-icon-wrapper bg-white-10">
                                    <i class="fas fa-video fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Upload -->
                <section class="card border-0 mb-4 shadow-sm">
                    <div class="card-header bg-white py-3 border-0">
                        <h5 class="mb-0 fw-semibold text-secondary"><i
                                class="fas fa-cloud-upload-alt me-2 text-primary"></i>Upload de Arquivos</h5>
                    </div>
                    <div class="card-body p-4">
                        <div id="drop-zone" class="drop-zone p-5 text-center mb-4">
                            <i class="fas fa-cloud-upload-alt fa-3x mb-3 text-primary"></i>
                            <h5 class="fw-semibold text-dark">Arraste e solte seus arquivos aqui</h5>
                            <p class="text-muted mb-3 small">Formatos suportados: JPG, PNG, GIF, MP4, WEBM (Limite:
                                30MB)</p>
                            <button class="btn btn-outline-primary px-4 py-2" type="button">
                                <i class="fas fa-folder-open me-2"></i>Selecionar Arquivos
                            </button>
                            <input type="file" id="file-input" name="files[]" multiple class="d-none">
                        </div>

                        <div id="file-preview-list" class="mb-4"></div>

                        <div id="progress-container" class="progress-container d-none mb-4">
                            <div class="d-flex justify-content-between mb-2">
                                <span class="small fw-semibold text-muted">Progresso do Upload</span>
                                <span id="progress-percentage" class="small fw-bold text-primary">0%</span>
                            </div>
                            <div class="progress rounded-pill" style="height: 10px;">
                                <div id="progress-bar"
                                    class="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                                    role="progressbar" style="width: 0%"></div>
                            </div>
                        </div>

                        <button id="upload-btn" class="btn btn-primary w-100 py-3 fw-semibold">
                            <i class="fas fa-upload me-2"></i>Iniciar Upload
                        </button>
                    </div>
                </section>

                <!-- Lista de arquivos enviados -->
                <section class="card border-0 shadow-sm">
                    <div
                        class="card-header bg-white py-3 border-0 d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <h5 class="mb-0 fw-semibold text-secondary"><i class="fas fa-list me-2 text-primary"></i>Itens
                            Carregados</h5>
                        <div class="d-flex gap-2">
                            <div class="input-group" style="width: 240px;">
                                <input type="text" class="form-control border-end-0" placeholder="Pesquisar..."
                                    id="searchInput">
                                <button class="btn btn-outline-secondary border-start-0" type="button">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                            <button class="btn btn-light-custom" id="refreshBtn" title="Atualizar Lista">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body p-4">
                        <div id="feedback-message" class="alert d-none" role="alert"></div>
                        <div id="uploaded-list" class="row g-4">
                            <!-- Dinâmico -->
                        </div>
                    </div>
                </section>

                <!-- Visualização Prévia -->
                <section id="display-area" class="mt-4 d-none">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3">
                            <h5 class="mb-0 fw-semibold text-secondary"><i
                                    class="fas fa-eye me-2 text-primary"></i>Visualização Prévia</h5>
                        </div>
                        <div class="card-body text-center bg-dark p-0 rounded-bottom overflow-hidden">
                            <div class="preview-container">
                                <!-- Dinâmico -->
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <!-- Footer -->
            <footer class="admin-footer py-3 border-top mt-5">
                <div class="container-fluid">
                    <div class="row align-items-center text-center text-md-start">
                        <div class="col-md-6">
                            <p class="mb-0 text-muted small"><i class="fas fa-copyright me-1"></i> <?= date('Y') ?>
                                SENAI - Sistema de Vagas</p>
                        </div>
                        <div class="col-md-6 text-md-end mt-2 mt-md-0">
                            <p class="mb-0 text-muted small">Versão 2.0 | Desenvolvido por <strong
                                    class="text-secondary">Lenon Yuri</strong></p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    </div>

    <!-- Modal de Ajuda -->
    <div class="modal fade" id="helpModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-primary text-white py-3">
                    <h5 class="modal-title"><i class="fas fa-question-circle me-2"></i>Central de Ajuda</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <div class="modal-body p-4">
                    <p class="text-muted">Gerencie facilmente os conteúdos exibidos na TV do SENAI.</p>
                    <div class="accordion mt-3" id="helpAccordion">
                        <div class="accordion-item border-0 mb-2 shadow-sm rounded">
                            <h2 class="accordion-header">
                                <button class="accordion-button rounded" type="button" data-bs-toggle="collapse"
                                    data-bs-target="#uploadHelp">
                                    <i class="fas fa-cloud-upload-alt me-2 text-primary"></i>Como enviar mídias?
                                </button>
                            </h2>
                            <div id="uploadHelp" class="accordion-collapse collapse show"
                                data-bs-parent="#helpAccordion">
                                <div class="accordion-body text-muted">
                                    <p class="mb-1">Arraste seus arquivos para a zona de drag-and-drop ou selecione
                                        manualmente.</p>
                                    <p class="mb-0"><strong>Formatos aceitos:</strong> JPG, PNG, GIF, MP4 e WEBM de até
                                        30MB.</p>
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item border-0 shadow-sm rounded">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed rounded" type="button"
                                    data-bs-toggle="collapse" data-bs-target="#managementHelp">
                                    <i class="fas fa-cog me-2 text-primary"></i>Gerenciar exibição e tempo
                                </button>
                            </h2>
                            <div id="managementHelp" class="accordion-collapse collapse"
                                data-bs-parent="#helpAccordion">
                                <div class="accordion-body text-muted">
                                    <p class="mb-0">Configure os segundos de transição individualmente para imagens.
                                        Vídeos são reproduzidos automaticamente até o final.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-0 p-3 bg-light">
                    <button type="button" class="btn btn-primary px-4" data-bs-dismiss="modal">Fechar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- ============================================================ -->
    <!-- SCRIPTS COM VERSIONAMENTO AUTOMÁTICO (ANTI-CACHE)            -->
    <!-- ============================================================ -->
    <!-- Bootstrap -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Config.js (na raiz do projeto) -->
    <script src="../config.js?v=<?= getFileVersion('../config.js') ?>"></script>

    <!-- Drops Engine (notícias) -->
    <script src="../user/js/drops.js?v=<?= getFileVersion('../user/js/drops.js') ?>"></script>

    <!-- Admin Scripts -->
    <script src="./js/indexadmin.js?v=<?= getFileVersion('./js/indexadmin.js') ?>"></script>
    <script src="./js/upload.js?v=<?= getFileVersion('./js/upload.js') ?>"></script>

</body>

</html>