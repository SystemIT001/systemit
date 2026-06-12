<?php
// Permitir peticiones desde cualquier origen (CORS) para desarrollo local
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';
verifyAuth();

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] != 0) {
        http_response_code(400);
        echo json_encode(["error" => "No file uploaded or error during upload"]);
        exit();
    }

    $file = $_FILES['file'];
    $type = isset($_POST['type']) && !empty($_POST['type']) ? $_POST['type'] : 'facturas';
    
    // Directorio de destino: subimos un nivel desde 'api' y entramos a 'uploads'
    $targetDir = "../uploads/" . $type . "/";
    
    // Crear el directorio si no existe (recursivo)
    if (!file_exists($targetDir)) {
        mkdir($targetDir, 0777, true);
    }

    $originalName = $file['name'];
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    
    // Security: Block execution of php scripts
    $allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'csv', 'xlsx', 'xls', 'doc', 'docx'];
    if (!in_array($extension, $allowed_extensions)) {
        http_response_code(403);
        echo json_encode(["error" => "Tipo de archivo no permitido."]);
        exit();
    }
    
    $baseName = 'archivo';
    if (isset($_POST['customName']) && !empty(trim($_POST['customName']))) {
        $baseName = trim($_POST['customName']);
    } else {
        $baseName = pathinfo($originalName, PATHINFO_FILENAME);
    }
    
    // Limpiar el nombre de caracteres especiales
    $baseName = preg_replace('/[^a-zA-Z0-9_\-\x{00C0}-\x{017F}]/u', '-', $baseName);
    $baseName = preg_replace('/-+/', '-', $baseName);

    // Generar un nombre único
    $uniqueSuffix = time() . '-' . rand(0, 10000);
    $newFileName = $baseName . '-' . $uniqueSuffix . '.' . $extension;
    $targetFilePath = $targetDir . $newFileName;

    // Mover el archivo a su destino final
    if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
        // La URL de retorno para el frontend
        $fileUrl = '/uploads/' . $type . '/' . $newFileName;
        echo json_encode([
            "url" => $fileUrl, 
            "fileName" => isset($_POST['customName']) && !empty(trim($_POST['customName'])) ? trim($_POST['customName']) : $originalName
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to move uploaded file."]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>
