<?php
require_once 'db.php';
// NO verifyAuth() here, this is public access via token

$method = $_SERVER['REQUEST_METHOD'];
$token = $_GET['token'] ?? null;

if (!$token) {
    http_response_code(400);
    echo json_encode(["error" => "Token is required"]);
    exit();
}

// Ensure the tables have clientToken
try {
    $conn->exec("ALTER TABLE projects ADD COLUMN clientToken VARCHAR(100) DEFAULT NULL");
} catch(Exception $e) {}
try {
    $conn->exec("ALTER TABLE quotes ADD COLUMN clientToken VARCHAR(100) DEFAULT NULL");
} catch(Exception $e) {}


if ($method === 'GET') {
    // Buscar en proyectos
    $stmt = $conn->prepare("SELECT * FROM projects WHERE clientToken = :token LIMIT 1");
    $stmt->execute([':token' => $token]);
    $project = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($project) {
        $project['materials'] = json_decode($project['materials'] ?? '[]', true) ?: [];
        $project['equipments'] = json_decode($project['equipments'] ?? '[]', true) ?: [];
        $project['labor'] = json_decode($project['labor'] ?? '[]', true) ?: [];
        $project['invoices'] = json_decode($project['invoices'] ?? '[]', true) ?: [];
        $project['payments'] = json_decode($project['payments'] ?? '[]', true) ?: [];
        $project['expenses'] = json_decode($project['expenses'] ?? '[]', true) ?: [];
        $project['tasks'] = json_decode($project['tasks'] ?? '[]', true) ?: [];
        $project['images'] = json_decode($project['images'] ?? '[]', true) ?: [];
        $project['exchangeRate'] = floatval($project['exchangeRate']);
        $project['isQuote'] = false;
        
        echo json_encode($project);
        exit();
    }

    // Buscar en cotizaciones
    $stmt = $conn->prepare("SELECT * FROM quotes WHERE clientToken = :token LIMIT 1");
    $stmt->execute([':token' => $token]);
    $quote = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($quote) {
        $quote['materials'] = json_decode($quote['materials'] ?? '[]', true) ?: [];
        $quote['equipments'] = json_decode($quote['equipments'] ?? '[]', true) ?: [];
        $quote['labor'] = json_decode($quote['labor'] ?? '[]', true) ?: [];
        $quote['expenses'] = json_decode($quote['expenses'] ?? '[]', true) ?: [];
        $quote['tasks'] = json_decode($quote['tasks'] ?? '[]', true) ?: [];
        $quote['exchangeRate'] = floatval($quote['exchangeRate']);
        $quote['isQuote'] = true;

        echo json_encode($quote);
        exit();
    }

    http_response_code(404);
    echo json_encode(["error" => "Project/Quote not found with that token"]);
} 
elseif ($method === 'POST') {
    $action = $_GET['action'] ?? null;

    if ($action === 'approve') {
        // Find quote
        $stmt = $conn->prepare("SELECT * FROM quotes WHERE clientToken = :token LIMIT 1");
        $stmt->execute([':token' => $token]);
        $quote = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$quote) {
            http_response_code(404);
            echo json_encode(["error" => "Quote not found"]);
            exit();
        }

        // Get max project code
        $res = $conn->query("SELECT MAX(CAST(projectCode AS UNSIGNED)) as max_code FROM projects");
        $row = $res->fetch(PDO::FETCH_ASSOC);
        $nextCode = ($row['max_code'] ?? 0) + 1;

        $currentLastUpdated = round(microtime(true) * 1000);

        // Insert into projects
        $sql = "INSERT INTO projects (id, clientId, clientName, projectName, projectCode, date, status, exchangeRate, materials, equipments, labor, invoices, payments, expenses, tasks, images, lastUpdated, clientToken) 
                VALUES (:id, :clientId, :clientName, :projectName, :projectCode, :date, 'not_started', :exchangeRate, :materials, :equipments, :labor, '[]', '[]', :expenses, :tasks, '[]', :lastUpdated, :clientToken)";
        
        $insertStmt = $conn->prepare($sql);
        $insertStmt->execute([
            ':id' => $quote['id'],
            ':clientId' => $quote['clientId'],
            ':clientName' => $quote['clientName'],
            ':projectName' => $quote['projectName'],
            ':projectCode' => $nextCode,
            ':date' => $quote['date'],
            ':exchangeRate' => $quote['exchangeRate'],
            ':materials' => $quote['materials'],
            ':equipments' => $quote['equipments'],
            ':labor' => $quote['labor'],
            ':expenses' => $quote['expenses'],
            ':tasks' => $quote['tasks'],
            ':lastUpdated' => $currentLastUpdated,
            ':clientToken' => $quote['clientToken']
        ]);

        // Delete from quotes
        $delStmt = $conn->prepare("DELETE FROM quotes WHERE id = :id");
        $delStmt->execute([':id' => $quote['id']]);

        // Opcional: Podríamos disparar un Webhook interno aquí mismo si queremos
        echo json_encode(["success" => true, "message" => "Quote approved and converted to project"]);
    } 
    elseif ($action === 'ticket') {
        // Create support ticket
        $data = json_decode(file_get_contents("php://input"), true);
        $title = $data['title'] ?? 'Ticket desde Portal';
        $desc = $data['description'] ?? '';

        // Buscamos a quien pertenece
        $stmt = $conn->prepare("SELECT clientName, projectName FROM projects WHERE clientToken = :token UNION SELECT clientName, projectName FROM quotes WHERE clientToken = :token LIMIT 1");
        $stmt->execute([':token' => $token]);
        $entity = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$entity) {
            http_response_code(404);
            echo json_encode(["error" => "Invalid token"]);
            exit();
        }

        try {
            $conn->exec("CREATE TABLE IF NOT EXISTS tickets (
                id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(255),
                description TEXT,
                clientName VARCHAR(255),
                date VARCHAR(50),
                status VARCHAR(50),
                priority VARCHAR(50),
                cost DECIMAL(10,2),
                currency VARCHAR(10),
                lastUpdated BIGINT
            )");
        } catch(Exception $e) {}

        $ticketId = 'TKT-' . time();
        $date = date('Y-m-d');
        
        $sql = "INSERT INTO tickets (id, title, description, clientName, date, status, priority, cost, currency, lastUpdated) 
                VALUES (?, ?, ?, ?, ?, 'open', 'normal', 0, 'USD', ?)";
        $ins = $conn->prepare($sql);
        $ins->execute([
            $ticketId,
            $title,
            "Proyecto Relacionado: " . $entity['projectName'] . "\n\n" . $desc,
            $entity['clientName'] ?? 'Cliente del Portal',
            $date,
            time() * 1000
        ]);

        echo json_encode(["success" => true, "message" => "Ticket created successfully"]);
    }
    else {
        http_response_code(400);
        echo json_encode(["error" => "Invalid action"]);
    }
}
else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>
