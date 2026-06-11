<?php
require_once 'db.php';
verifyAuth();

try {
    // Auto-create table
    $conn->exec("CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(50) PRIMARY KEY,
        companyName VARCHAR(255),
        subtitle VARCHAR(255),
        docType VARCHAR(100),
        footerText TEXT,
        webhookUrl TEXT
    )");

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $stmt = $conn->query("SELECT * FROM settings WHERE id = 'global'");
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($settings) {
            echo json_encode($settings);
        } else {
            echo json_encode([
                "companyName" => "Mi Empresa IT",
                "subtitle" => "Reporte de Servicios y Equipos",
                "docType" => "COTIZACIÓN",
                "footerText" => "Gracias por su preferencia. Este documento es válido como cotización o nota de servicio.",
                "webhookUrl" => ""
            ]);
        }
    }
    elseif ($method === 'POST' || $method === 'PUT') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $sql = "INSERT INTO settings (id, companyName, subtitle, docType, footerText, webhookUrl) 
                VALUES ('global', :companyName, :subtitle, :docType, :footerText, :webhookUrl)
                ON DUPLICATE KEY UPDATE 
                companyName=VALUES(companyName), subtitle=VALUES(subtitle), 
                docType=VALUES(docType), footerText=VALUES(footerText), webhookUrl=VALUES(webhookUrl)";
                
        $stmt = $conn->prepare($sql);
        $stmt->execute([
            ':companyName' => $data['companyName'] ?? 'Mi Empresa IT',
            ':subtitle' => $data['subtitle'] ?? 'Reporte de Servicios y Equipos',
            ':docType' => $data['docType'] ?? 'COTIZACIÓN',
            ':footerText' => $data['footerText'] ?? 'Gracias por su preferencia...',
            ':webhookUrl' => $data['webhookUrl'] ?? ''
        ]);

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
