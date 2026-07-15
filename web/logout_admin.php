<?php
require_once 'admin_auth.php';
session_destroy();
header('Location: login_admin.php');
exit;
?>
