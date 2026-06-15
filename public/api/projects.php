<?php
require_once 'db.php';
verifyAuth();

$method = $_SERVER['REQUEST_METHOD'];

// Ensure lastUpdated column exists (MySQL)
try {
    $conn->exec("ALTER TABLE projects ADD COLUMN lastUpdated BIGINT");
} catch(Exception $e) {
    // Column already exists, ignore
}

// Ensure clientToken column exists
try {
    $conn->exec("ALTER TABLE projects ADD COLUMN clientToken VARCHAR(255)");
} catch(Exception $e) {
    // Column already exists, ignore
}

// Ensure advances column exists
try {
    $conn->exec("ALTER TABLE projects ADD COLUMN advances LONGTEXT");
} catch(Exception $e) {
    // Column already exists, ignore
}

// Ensure profitUsers column exists
try {
    $conn->exec("ALTER TABLE projects ADD COLUMN profitUsers LONGTEXT");
} catch(Exception $e) {
    // Column already exists, ignore
}

if ($method === 'GET') {
    // Obtener todos los proyectos
    $stmt = $conn->query("SELECT * FROM projects");
    $projects = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Deserializar los campos JSON
        $row['materials'] = json_decode($row['materials'] ?? '[]', true) ?: [];
        $row['equipments'] = json_decode($row['equipments'] ?? '[]', true) ?: [];
        $row['labor'] = json_decode($row['labor'] ?? '[]', true) ?: [];
        $row['invoices'] = json_decode($row['invoices'] ?? '[]', true) ?: [];
        $row['payments'] = json_decode($row['payments'] ?? '[]', true) ?: [];
        $row['expenses'] = json_decode($row['expenses'] ?? '[]', true) ?: [];
        $row['tasks'] = json_decode($row['tasks'] ?? '[]', true) ?: [];
        $row['images'] = json_decode($row['images'] ?? '[]', true) ?: [];
        $row['advances'] = json_decode($row['advances'] ?? '[]', true) ?: [];
        $row['profitUsers'] = json_decode($row['profitUsers'] ?? '[]', true) ?: [];
        $row['exchangeRate'] = floatval($row['exchangeRate']);
        $projects[] = $row;
    }
    echo json_encode($projects);
} 
elseif ($method === 'POST' || $method === 'PUT') {
    // Crear o actualizar un proyecto
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(["error" => "ID is required"]);
        exit();
    }

    $id = $data['id'];
    $clientId = $data['clientId'] ?? null;
    $clientName = $data['clientName'] ?? '';
    $projectName = $data['projectName'] ?? '';
    $projectCode = $data['projectCode'] ?? null;
    $date = $data['date'] ?? '';
    $status = $data['status'] ?? 'draft';
    $exchangeRate = isset($data['exchangeRate']) ? floatval($data['exchangeRate']) : 36.62;
    
    // Serializar campos complejos a JSON
    $materials = json_encode($data['materials'] ?? []);
    $equipments = json_encode($data['equipments'] ?? []);
    $labor = json_encode($data['labor'] ?? []);
    $invoices = json_encode($data['invoices'] ?? []);
    $payments = json_encode($data['payments'] ?? []);
    $expenses = json_encode($data['expenses'] ?? []);
    $tasks = json_encode($data['tasks'] ?? []);
    $images = json_encode($data['images'] ?? []);
    $advances = json_encode($data['advances'] ?? []);
    $profitUsers = json_encode($data['profitUsers'] ?? []);
    $clientToken = $data['clientToken'] ?? bin2hex(random_bytes(16));

    $currentLastUpdated = round(microtime(true) * 1000);
    
    // Check concurrency for PUT
    if ($method === 'PUT') {
        $stmt = $conn->prepare("SELECT lastUpdated FROM projects WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $clientLastUpdated = isset($data['lastUpdated']) ? intval($data['lastUpdated']) : 0;
        $dbLastUpdated = ($row && isset($row['lastUpdated'])) ? intval($row['lastUpdated']) : 0;
        
        // Conflicto check disabled to prevent errors on rapid saves
        // if ($dbLastUpdated > 0 && $clientLastUpdated > 0 && $dbLastUpdated > $clientLastUpdated) {
        //     http_response_code(409);
        //     echo json_encode(["error" => "Conflicto de guardado: El proyecto fue modificado por otro usuario mientras lo estabas editando. Refresca la página para ver los cambios."]);
        //     exit();
        // }
    }

    // Intentar insertar o actualizar si el ID ya existe (UPSERT)
    $sql = "INSERT INTO projects (id, clientId, clientName, projectName, projectCode, date, status, exchangeRate, materials, equipments, labor, invoices, payments, expenses, tasks, images, advances, profitUsers, lastUpdated, clientToken) 
            VALUES (:id, :clientId, :clientName, :projectName, :projectCode, :date, :status, :exchangeRate, :materials, :equipments, :labor, :invoices, :payments, :expenses, :tasks, :images, :advances, :profitUsers, :lastUpdated, :clientToken)
            ON DUPLICATE KEY UPDATE 
            clientId=:clientId, clientName=:clientName, projectName=:projectName, projectCode=:projectCode, date=:date, status=:status, 
            exchangeRate=:exchangeRate, materials=:materials, equipments=:equipments, labor=:labor, invoices=:invoices, payments=:payments, expenses=:expenses, tasks=:tasks, images=:images, advances=:advances, profitUsers=:profitUsers, lastUpdated=:lastUpdated, clientToken=:clientToken";
            
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':clientId' => $clientId,
        ':clientName' => $clientName,
        ':projectName' => $projectName,
        ':projectCode' => $projectCode,
        ':date' => $date,
        ':status' => $status,
        ':exchangeRate' => $exchangeRate,
        ':materials' => $materials,
        ':equipments' => $equipments,
        ':labor' => $labor,
        ':invoices' => $invoices,
        ':payments' => $payments,
        ':expenses' => $expenses,
        ':tasks' => $tasks,
        ':images' => $images,
        ':advances' => $advances,
        ':profitUsers' => $profitUsers,
        ':lastUpdated' => $currentLastUpdated,
        ':clientToken' => $clientToken
    ]);

    echo json_encode(["success" => true, "message" => "Project saved successfully", "lastUpdated" => $currentLastUpdated, "clientToken" => $clientToken]);
}
elseif ($method === 'DELETE') {
    // Eliminar un proyecto
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "ID is required"]);
        exit();
    }

    $stmt = $conn->prepare("DELETE FROM projects WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode(["success" => true, "message" => "Project deleted successfully"]);
}
else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>
