<?php
require_once 'db.php';

try {
    // 1. Add clientToken to projects
    try {
        $conn->exec("ALTER TABLE projects ADD COLUMN clientToken VARCHAR(100) DEFAULT NULL");
        echo "✅ Columna clientToken añadida a projects.<br>";
    } catch(PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "ℹ️ Columna clientToken ya existe en projects.<br>";
        } else {
            echo "❌ Error en projects: " . $e->getMessage() . "<br>";
        }
    }

    // 2. Add clientToken to quotes
    try {
        $conn->exec("ALTER TABLE quotes ADD COLUMN clientToken VARCHAR(100) DEFAULT NULL");
        echo "✅ Columna clientToken añadida a quotes.<br>";
    } catch(PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "ℹ️ Columna clientToken ya existe en quotes.<br>";
        } else {
            echo "❌ Error en quotes: " . $e->getMessage() . "<br>";
        }
    }

    // 3. Add webhookUrl to settings
    try {
        $conn->exec("ALTER TABLE settings ADD COLUMN webhookUrl TEXT DEFAULT NULL");
        echo "✅ Columna webhookUrl añadida a settings.<br>";
    } catch(PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "ℹ️ Columna webhookUrl ya existe en settings.<br>";
        } else {
            // Tabla settings no existe? O error?
            echo "❌ Error en settings: " . $e->getMessage() . "<br>";
        }
    }

    // 4. Update existing projects and quotes to have a token if they don't
    $stmt = $conn->query("SELECT id FROM projects WHERE clientToken IS NULL OR clientToken = ''");
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($projects as $p) {
        $token = bin2hex(random_bytes(16));
        $update = $conn->prepare("UPDATE projects SET clientToken = ? WHERE id = ?");
        $update->execute([$token, $p['id']]);
    }
    echo "✅ " . count($projects) . " proyectos actualizados con tokens.<br>";

    $stmt = $conn->query("SELECT id FROM quotes WHERE clientToken IS NULL OR clientToken = ''");
    $quotes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($quotes as $q) {
        $token = bin2hex(random_bytes(16));
        $update = $conn->prepare("UPDATE quotes SET clientToken = ? WHERE id = ?");
        $update->execute([$token, $q['id']]);
    }
    echo "✅ " . count($quotes) . " cotizaciones actualizadas con tokens.<br>";

    echo "<br><b>¡Base de datos actualizada exitosamente! Ya puedes borrar este archivo.</b>";

} catch (Exception $e) {
    echo "Error general: " . $e->getMessage();
}
?>
