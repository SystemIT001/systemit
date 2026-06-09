<?php
require_once 'db.php';
verifyAuth();

try {
    // Auto-create table
    $conn->exec("CREATE TABLE IF NOT EXISTS purchases (
        id VARCHAR(50) PRIMARY KEY,
        supplierName VARCHAR(255),
        date VARCHAR(50),
        amount DECIMAL(10,2),
        description TEXT,
        status VARCHAR(50),
        paymentMethod VARCHAR(50)
    )");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $stmt = $conn->query("SELECT * FROM purchases");
        $purchases = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($purchases);
    }
    elseif ($method === 'POST' || $method === 'PUT') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "ID is required"]);
            exit();
        }

        $sql = "INSERT INTO purchases (id, supplierName, date, amount, description, status, paymentMethod) 
                VALUES (:id, :supplierName, :date, :amount, :description, :status, :paymentMethod)
                ON DUPLICATE KEY UPDATE 
                supplierName=VALUES(supplierName), date=VALUES(date), amount=VALUES(amount), 
                description=VALUES(description), status=VALUES(status), paymentMethod=VALUES(paymentMethod)";
                
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':id' => $data['id'],
            ':supplierName' => $data['supplierName'] ?? '',
            ':date' => $data['date'] ?? '',
            ':amount' => floatval($data['amount'] ?? 0),
            ':description' => $data['description'] ?? '',
            ':status' => $data['status'] ?? 'pending',
            ':paymentMethod' => $data['paymentMethod'] ?? 'cash'
        ]);

        echo json_encode(["success" => true]);
    }
    elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "ID is required"]);
            exit();
        }

        $stmt = $conn->prepare("DELETE FROM purchases WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(["success" => true]);
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
