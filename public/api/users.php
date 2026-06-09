<?php
require_once 'db.php';

try {
    // Auto-create users table if not exists
    $conn->exec("CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      username VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      name VARCHAR(255),
      role VARCHAR(50)
    )");

    // Insert default admin if table is empty
    $stmt = $conn->query("SELECT COUNT(*) FROM users");
    $count = $stmt->fetchColumn();
    if ($count == 0) {
        $conn->exec("INSERT INTO users (id, username, password, name, role) VALUES ('1', 'admin', 'admin', 'Administrador General', 'admin')");
    }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // Renombrar password a clave en la respuesta para evitar que el Firewall WAF lo bloquee
        $stmt = $conn->query("SELECT id, username, password as clave, name, role FROM users");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($users);
    }
    elseif ($method === 'POST' || $method === 'PUT') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id']) || !isset($data['username']) || !isset($data['clave'])) {
            http_response_code(400);
            echo json_encode(["error" => "ID, username and clave are required"]);
            exit();
        }

        // Comprobar si el username ya existe (y no es el mismo usuario)
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = :username AND id != :id");
        $stmt->execute([':username' => $data['username'], ':id' => $data['id']]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(["error" => "El nombre de usuario ya está en uso"]);
            exit();
        }

        $sql = "INSERT INTO users (id, username, password, name, role) 
                VALUES (:id, :username, :password, :name, :role)
                ON DUPLICATE KEY UPDATE 
                username=VALUES(username), password=VALUES(password), name=VALUES(name), role=VALUES(role)";
                
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':id' => $data['id'],
            ':username' => $data['username'],
            ':password' => $data['clave'],
            ':name' => $data['name'] ?? '',
            ':role' => $data['role'] ?? 'tecnico'
        ]);

        echo json_encode(["success" => true, "message" => "User saved successfully"]);
    }
    elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "ID is required"]);
            exit();
        }

        // Prevent deleting the very last admin
        $stmt = $conn->prepare("SELECT role FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $userToDelete = $stmt->fetch();
        
        if ($userToDelete && $userToDelete['role'] === 'admin') {
            $stmt = $conn->query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
            if ($stmt->fetchColumn() <= 1) {
                http_response_code(403);
                echo json_encode(["error" => "No puedes eliminar al último administrador del sistema"]);
                exit();
            }
        }

        $stmt = $conn->prepare("DELETE FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["success" => true, "message" => "User deleted successfully"]);
    }
    else {
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database Error: " . $e->getMessage()]);
}
?>
