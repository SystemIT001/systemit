<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

try {
    $backup = [];

    // Fetch projects
    $stmt = $conn->query("SELECT * FROM projects");
    $backup['projects'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch inventory
    $stmt = $conn->query("SELECT * FROM inventory");
    $backup['inventory'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $json = json_encode($backup);

    $date = date('Y-m-d_H-i-s');
    $filename = "SystemIT_Backup_$date.json";

    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    echo $json;
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Backup failed: " . $e->getMessage()]);
}
?>
