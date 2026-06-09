<?php
require_once 'db.php';

echo "Starting migration...\n";

try {
    // 1. Añadir columna token a la tabla users si no existe
    $conn->exec("ALTER TABLE users ADD COLUMN token VARCHAR(255) NULL");
    echo "Columna 'token' añadida o ya existente.\n";
} catch (Exception $e) {
    echo "Nota: " . $e->getMessage() . "\n";
}

try {
    // 2. Obtener todos los usuarios
    $stmt = $conn->query("SELECT id, password FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Encriptar contraseñas en texto plano
    $updatedCount = 0;
    foreach ($users as $user) {
        // Solo encriptar si NO está encriptada ya (las contraseñas hash de PHP empiezan por $2y$ o similares)
        if (!preg_match('/^\$2[ayb]\$.{56}$/', $user['password'])) {
            $hashed = password_hash($user['password'], PASSWORD_DEFAULT);
            $updateStmt = $conn->prepare("UPDATE users SET password = :hash WHERE id = :id");
            $updateStmt->execute([':hash' => $hashed, ':id' => $user['id']]);
            $updatedCount++;
        }
    }

    echo "Migración completada. Se encriptaron $updatedCount contraseñas.\n";
} catch (Exception $e) {
    echo "Error crítico: " . $e->getMessage() . "\n";
}
?>
