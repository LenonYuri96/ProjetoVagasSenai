<?php
require_once 'session_config.php'; // ← ADICIONE ESTA LINHA
session_start();
session_destroy();
header('Location: ../index.php');
exit;
?>