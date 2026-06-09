<?php
require_once 'db.php';
verifyAuth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query("SELECT * FROM inventory");
    $inventory = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $row['unitCost'] = floatval($row['unitCost']);
        $row['stockQuantity'] = intval($row['stockQuantity']);
        $inventory[] = $row;
    }
    echo json_encode($inventory);
} 
elseif ($method === 'POST' || $method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(["error" => "ID is required"]);
        exit();
    }

    $id = $data['id'];
    $name = $data['name'] ?? '';
    $unitCost = isset($data['unitCost']) ? floatval($data['unitCost']) : 0;
    $stockQuantity = isset($data['stockQuantity']) ? intval($data['stockQuantity']) : 0;
    $category = $data['category'] ?? 'materials';
    $lastUpdated = $data['lastUpdated'] ?? date('Y-m-d\TH:i:s\Z');

    $sql = "INSERT INTO inventory (id, name, unitCost, stockQuantity, category, lastUpdated) 
            VALUES (:id, :name, :unitCost, :stockQuantity, :category, :lastUpdated)
            ON DUPLICATE KEY UPDATE 
            name=:name, unitCost=:unitCost, stockQuantity=:stockQuantity, category=:category, lastUpdated=:lastUpdated";
            
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':name' => $name,
        ':unitCost' => $unitCost,
        ':stockQuantity' => $stockQuantity,
        ':category' => $category,
        ':lastUpdated' => $lastUpdated
    ]);

    echo json_encode(["success" => true, "message" => "Item saved successfully"]);
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "ID is required"]);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM inventory WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode(["success" => true, "message" => "Item deleted successfully"]);
}
else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>
