<?php
require_once 'db.php';
verifyAuth();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $event = $data['event'] ?? 'unknown';
    $payload = $data['payload'] ?? [];
    
    // Get webhook URL from settings
    $stmt = $conn->query("SELECT webhookUrl FROM settings WHERE id = 'global'");
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    $webhookUrl = $settings['webhookUrl'] ?? '';
    
    if (empty($webhookUrl)) {
        echo json_encode(["success" => false, "message" => "Webhook URL not configured"]);
        exit();
    }
    
    // Prepare payload
    $webhookData = [
        "event" => $event,
        "timestamp" => date('c'),
        "data" => $payload
    ];
    
    // Send via cURL
    $ch = curl_init($webhookUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    // Set a timeout so we don't block the PHP thread indefinitely
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode >= 200 && $httpCode < 300) {
        echo json_encode(["success" => true, "message" => "Webhook sent successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to send webhook, HTTP code $httpCode"]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>
