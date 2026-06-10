<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(["error" => "No file uploaded"]);
    exit();
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(["error" => "Upload failed"]);
    exit();
}

$json = file_get_contents($file['tmp_name']);
$data = json_decode($json, true);

if (!$data || (!isset($data['projects']) && !isset($data['inventory']))) {
    http_response_code(400);
    echo json_encode(["error" => "Formato JSON inválido. Asegúrate de que sea un archivo de respaldo válido de SystemIT."]);
    exit();
}

try {
    $conn->beginTransaction();

    // Restore projects
    if (isset($data['projects']) && is_array($data['projects'])) {
        $conn->exec("DELETE FROM projects"); // Clear table
        
        if (count($data['projects']) > 0) {
            $stmt = $conn->prepare("INSERT INTO projects (id, clientName, projectName, date, status, exchangeRate, materials, equipments, labor, invoices, payments, projectCode, expenses, tasks, clientId, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            foreach ($data['projects'] as $p) {
                $stmt->execute([
                    $p['id'], $p['clientName'], $p['projectName'], $p['date'], $p['status'], 
                    $p['exchangeRate'], $p['materials'], $p['equipments'], $p['labor'], 
                    $p['invoices'], $p['payments'], $p['projectCode'], $p['expenses'], 
                    $p['tasks'], $p['clientId'], $p['images']
                ]);
            }
        }
    }

    // Restore quotes
    if (isset($data['quotes']) && is_array($data['quotes'])) {
        $conn->exec("CREATE TABLE IF NOT EXISTS quotes (id VARCHAR(50) PRIMARY KEY, clientName VARCHAR(255), projectName VARCHAR(255), date VARCHAR(50), status VARCHAR(50), exchangeRate DECIMAL(10,2), materials LONGTEXT, equipments LONGTEXT, labor LONGTEXT, projectCode VARCHAR(50), expenses LONGTEXT, tasks LONGTEXT, clientId VARCHAR(50))");
        $conn->exec("DELETE FROM quotes"); // Clear table
        
        if (count($data['quotes']) > 0) {
            $stmt = $conn->prepare("INSERT INTO quotes (id, clientName, projectName, date, status, exchangeRate, materials, equipments, labor, projectCode, expenses, tasks, clientId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            foreach ($data['quotes'] as $q) {
                $stmt->execute([
                    $q['id'], $q['clientName'], $q['projectName'], $q['date'], $q['status'], 
                    $q['exchangeRate'], $q['materials'], $q['equipments'], $q['labor'], 
                    $q['projectCode'], $q['expenses'], 
                    $q['tasks'], $q['clientId']
                ]);
            }
        }
    }

    // Restore inventory
    if (isset($data['inventory']) && is_array($data['inventory'])) {
        $conn->exec("DELETE FROM inventory"); // Clear table
        
        if (count($data['inventory']) > 0) {
            $stmt = $conn->prepare("INSERT INTO inventory (id, name, unitCost, stockQuantity, category, lastUpdated) VALUES (?, ?, ?, ?, ?, ?)");
            
            foreach ($data['inventory'] as $inv) {
                $stmt->execute([
                    $inv['id'], $inv['name'], $inv['unitCost'], $inv['stockQuantity'], 
                    $inv['category'], $inv['lastUpdated']
                ]);
            }
        }
    }

    // Restore clients
    if (isset($data['clients']) && is_array($data['clients'])) {
        $conn->exec("CREATE TABLE IF NOT EXISTS clients (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), contactPerson VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), address TEXT)");
        $conn->exec("DELETE FROM clients"); // Clear table
        
        if (count($data['clients']) > 0) {
            $stmt = $conn->prepare("INSERT INTO clients (id, name, contactPerson, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)");
            
            foreach ($data['clients'] as $c) {
                $stmt->execute([
                    $c['id'], $c['name'], $c['contactPerson'] ?? '', $c['email'] ?? '', 
                    $c['phone'] ?? '', $c['address'] ?? ''
                ]);
            }
        }
    }

    // Restore users
    if (isset($data['users']) && is_array($data['users'])) {
        $conn->exec("CREATE TABLE IF NOT EXISTS users (id VARCHAR(50) PRIMARY KEY, username VARCHAR(255) UNIQUE, password VARCHAR(255), name VARCHAR(255), role VARCHAR(50))");
        $conn->exec("DELETE FROM users"); // Clear table
        
        if (count($data['users']) > 0) {
            $stmt = $conn->prepare("INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)");
            
            foreach ($data['users'] as $u) {
                $stmt->execute([
                    $u['id'], $u['username'], $u['password'], $u['name'] ?? '', $u['role'] ?? 'tecnico'
                ]);
            }
        } else {
            // Seed default admin if user backup is empty
            $conn->exec("INSERT INTO users (id, username, password, name, role) VALUES ('1', 'admin', 'admin', 'Administrador General', 'admin')");
        }
    }

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Database restored successfully"]);

} catch(Exception $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(["error" => "Error al restaurar: " . $e->getMessage()]);
}
?>
