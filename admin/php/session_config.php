<?php
// ============================================================
// CONFIGURAÇÕES DE SESSÃO: 30 MINUTOS DE INATIVIDADE
// ============================================================

// 1. Tempo de vida da sessão em segundos (30 minutos = 1800 segundos)
$sessionLifetime = 1800;

// 2. Define o tempo de vida do cookie de sessão
session_set_cookie_params([
    'lifetime' => $sessionLifetime,
    'path' => '/',
    'domain' => '', // Deixe vazio para usar o domínio atual
    'secure' => false, // Altere para true se estiver usando HTTPS
    'httponly' => true,
    'samesite' => 'Lax' // Protege contra CSRF
]);

// 3. Configura o tempo máximo de vida do GC (garbage collector)
ini_set('session.gc_maxlifetime', $sessionLifetime);

// 4. Define a probabilidade de GC (garbage collection) para 1/1000
ini_set('session.gc_probability', 1);
ini_set('session.gc_divisor', 1000);

// 5. Garante que a sessão use apenas cookies (não URLs)
ini_set('session.use_only_cookies', 1);

// 6. Bloqueia acesso ao cookie de sessão via JavaScript (HTTP Only)
ini_set('session.cookie_httponly', 1);

// 7. Opcional: define o caminho do cookie para a raiz do site
ini_set('session.cookie_path', '/');

// 8. Impede que a sessão seja transmitida via URL
ini_set('session.use_trans_sid', 0);

// 9. Define o nome da sessão (opcional, mas evita conflitos com outros apps)
session_name('SENAI_ADMIN_SESSION');

// 10. Inicia a sessão apenas se ainda não estiver ativa
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 11. Verifica se a sessão está expirada por inatividade
if (isset($_SESSION['LAST_ACTIVITY'])) {
    $inactiveTime = time() - $_SESSION['LAST_ACTIVITY'];
    if ($inactiveTime > $sessionLifetime) {
        // Sessão expirada: destroi e redireciona para login
        session_unset();
        session_destroy();
        header('Location: ../index.php');
        exit;
    }
}

// 12. Atualiza o timestamp da última atividade
$_SESSION['LAST_ACTIVITY'] = time();

// 13. Regenera o ID da sessão periodicamente (a cada 5 minutos) para maior segurança
if (!isset($_SESSION['CREATED'])) {
    $_SESSION['CREATED'] = time();
} elseif (time() - $_SESSION['CREATED'] > 300) {
    // Regenera a sessão a cada 5 minutos
    session_regenerate_id(true);
    $_SESSION['CREATED'] = time();
}
?>