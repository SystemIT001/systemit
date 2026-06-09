<?php
require_once 'db.php';

// Auto-create clients table if not exists (This runs only once when needed)
$conn->exec("CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  contactPerson VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT
)");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query("SELECT * FROM clients");
    $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($clients);
} 
elseif ($method === 'POST' || $method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(["error" => "ID is required"]);
        exit();
    }

    $sql = "INSERT INTO clients (id, name, contactPerson, email, phone, address) 
            VALUES (:id, :name, :contactPerson, :email, :phone, :address)
            ON DUPLICATE KEY UPDATE 
            name=:name, contactPerson=:contactPerson, email=:email, phone=:phone, address=:address";
            
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':id' => $data['id'],
        ':name' => $data['name'] ?? '',
        ':contactPerson' => $data['contactPerson'] ?? '',
        ':email' => $data['email'] ?? '',
        ':phone' => $data['phone'] ?? '',
        ':address' => $data['address'] ?? ''
    ]);

    echo json_encode(["success" => true, "message" => "Client saved successfully"]);
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "ID is required"]);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM clients WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode(["success" => true, "message" => "Client deleted successfully"]);
}
else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>
