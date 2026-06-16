<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

// Ensure users are authenticated
verifyAuth();

if ($method === 'GET') {
    try {
        try {
            $pdo->exec("ALTER TABLE tickets ADD COLUMN technicianId VARCHAR(50)");
        } catch (PDOException $e) { /* ignore */ }

        $stmt = $pdo->query("SELECT * FROM tickets");
        $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($tickets);
    } catch (PDOException $e) {
        // Create table if it doesn't exist and retry
        if (strpos($e->getMessage(), "Base table or view not found") !== false) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS tickets (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255),
                description TEXT,
                clientName VARCHAR(255),
                date VARCHAR(50),
                status VARCHAR(50),
                priority VARCHAR(50),
                cost DECIMAL(10,2) DEFAULT 0,
                currency VARCHAR(10) DEFAULT 'NIO',
                lastUpdated BIGINT,
                technicianId VARCHAR(50)
            )");
            echo json_encode([]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    $id = $data['id'];
    $title = $data['title'];
    $description = $data['description'];
    $clientName = $data['clientName'] ?? '';
    $date = $data['date'] ?? date('Y-m-d');
    $status = $data['status'] ?? 'open';
    $priority = $data['priority'] ?? 'normal';
    $cost = isset($data['cost']) ? (float)$data['cost'] : 0;
    $currency = $data['currency'] ?? 'NIO';
    $technicianId = $data['technicianId'] ?? null;
    $lastUpdated = time() * 1000;

    try {
        $stmt = $pdo->prepare("INSERT INTO tickets (id, title, description, clientName, date, status, priority, cost, currency, technicianId, lastUpdated) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            title = VALUES(title), description = VALUES(description), clientName = VALUES(clientName),
            date = VALUES(date), status = VALUES(status), priority = VALUES(priority), 
            cost = VALUES(cost), currency = VALUES(currency), technicianId = VALUES(technicianId), lastUpdated = VALUES(lastUpdated)");
        
        $stmt->execute([$id, $title, $description, $clientName, $date, $status, $priority, $cost, $currency, $technicianId, $lastUpdated]);
        
        echo json_encode(['success' => true, 'id' => $id, 'lastUpdated' => $lastUpdated]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing ID']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM tickets WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
