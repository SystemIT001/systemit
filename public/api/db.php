<?php
// Permitir peticiones desde cualquier origen (CORS) para desarrollo local
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Si es una petición OPTIONS (preflight CORS), responder y salir
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de la base de datos
// Cambia esto con los datos de tu cuenta de InfinityFree
$servername = "localhost"; // En InfinityFree suele ser algo como "sql123.epizy.com"
$username = "root";        // Tu usuario de BD en InfinityFree
$password = "";            // Tu contraseña de BD en InfinityFree
$dbname = "systemit";      // El nombre de tu BD en InfinityFree

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8", $username, $password);
    // Configurar PDO para que lance excepciones en caso de error
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
    exit();
}
?>
