<?php
// ============================================================
// RESET DO BANCO DE DADOS - LIMPA TABELAS E RECRIA ADMIN
// ============================================================
require_once 'session_config.php';
session_start();

// Verifica se o usuário está logado (apenas admin pode resetar)
if (!isset($_SESSION['user_id'])) {
    header('Location: ../index.php');
    exit;
}

require_once 'db.php';

// Processa a confirmação via GET
if (isset($_GET['confirm']) && $_GET['confirm'] === 'yes') {
    try {
        $pdo = getDB();
        
        // Desativa verificação de chaves estrangeiras (se houver)
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
        
        // Limpa a tabela de mídias
        $pdo->exec("TRUNCATE TABLE midias");
        
        // Limpa a tabela de usuários
        $pdo->exec("TRUNCATE TABLE usuarios");
        
        // Reativa verificação
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        
        // Recria o usuário admin padrão
        $senhaHash = password_hash('Senai@2026', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO usuarios (usuario, senha) VALUES (?, ?)");
        $stmt->execute(['admin', $senhaHash]);
        
        $message = "✅ Banco de dados resetado com sucesso! Usuário 'admin' recriado com senha 'Senai@2026'.";
        $success = true;
    } catch (PDOException $e) {
        $message = "❌ Erro ao resetar banco: " . $e->getMessage();
        $success = false;
    }
} else {
    // Exibe formulário de confirmação
    $message = null;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Banco - SENAI</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background: #f4f6f9; display: flex; align-items: center; min-height: 100vh; }
        .card { max-width: 600px; margin: auto; border-radius: 16px; border: none; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .card-header { background: #dc3545; color: white; border-radius: 16px 16px 0 0; padding: 1.5rem; }
        .btn-danger { background: #dc3545; border: none; padding: 0.75rem 2rem; font-weight: 600; }
        .btn-danger:hover { background: #b02a37; }
        .btn-secondary { background: #6c757d; border: none; padding: 0.75rem 2rem; font-weight: 600; }
        .btn-secondary:hover { background: #5a6268; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card shadow">
            <div class="card-header text-center">
                <h4><i class="fas fa-database me-2"></i> Reset do Banco de Dados</h4>
                <p class="mb-0 text-white-50 small">Esta ação apagará TODAS as mídias e usuários, recriando apenas o admin padrão.</p>
            </div>
            <div class="card-body p-4">
                <?php if (isset($message)): ?>
                    <div class="alert <?= $success ? 'alert-success' : 'alert-danger' ?>">
                        <?= $message ?>
                    </div>
                    <div class="text-center mt-3">
                        <a href="../indexadminsenai.php" class="btn btn-primary">Voltar ao Painel</a>
                    </div>
                <?php else: ?>
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Atenção:</strong> Esta operação é irreversível. Todas as mídias e usuários serão removidos permanentemente.
                    </div>
                    <div class="row g-3">
                        <div class="col-6">
                            <a href="reset_db.php?confirm=yes" class="btn btn-danger w-100">
                                <i class="fas fa-check me-2"></i> Confirmar Reset
                            </a>
                        </div>
                        <div class="col-6">
                            <a href="../indexadminsenai.php" class="btn btn-secondary w-100">
                                <i class="fas fa-times me-2"></i> Cancelar
                            </a>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</body>
</html>