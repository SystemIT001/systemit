<?php
require_once 'db.php';
verifyAuth();

// Auto-create visits table if not exists
$conn->exec("CREATE TABLE IF NOT EXISTS visits (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255),
  clientId VARCHAR(50),
  projectId VARCHAR(50),
  date VARCHAR(50),
  endDate VARCHAR(50),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  technician VARCHAR(255)
)");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $conn->query("SELECT * FROM visits ORDER BY date ASC");
    $visits = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($visits);
} 
elseif ($method === 'POST' || $method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(["error" => "ID is required"]);
        exit();
    }

    $sql = "INSERT INTO visits (id, title, clientId, projectId, date, endDate, description, status, technician) 
            VALUES (:id, :title, :clientId, :projectId, :date, :endDate, :description, :status, :technician)
            ON DUPLICATE KEY UPDATE 
            title=VALUES(title), clientId=VALUES(clientId), projectId=VALUES(projectId), date=VALUES(date), endDate=VALUES(endDate), description=VALUES(description), status=VALUES(status), technician=VALUES(technician)";
            
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':id' => $data['id'],
        ':title' => $data['title'] ?? '',
        ':clientId' => $data['clientId'] ?? '',
        ':projectId' => $data['projectId'] ?? '',
        ':date' => $data['date'] ?? '',
        ':endDate' => $data['endDate'] ?? '',
        ':description' => $data['description'] ?? '',
        ':status' => $data['status'] ?? 'pending',
        ':technician' => $data['technician'] ?? ''
    ]);

    echo json_encode(["success" => true, "message" => "Visit saved successfully"]);
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "ID is required"]);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM visits WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode(["success" => true, "message" => "Visit deleted successfully"]);
}
else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>
