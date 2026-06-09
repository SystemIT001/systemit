<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'api/db.php';

echo "<h1>SystemIT Diagnostics</h1>";

try {
    echo "<h2>1. Database Connection</h2>";
    $conn->query("SELECT 1");
    echo "<p style='color:green'>✅ Connected to MySQL!</p>";

    echo "<h2>2. Projects Table</h2>";
    $stmt = $conn->query("SELECT COUNT(*) FROM projects");
    $count = $stmt->fetchColumn();
    echo "<p>Total projects in DB: <strong>$count</strong></p>";

    echo "<h2>3. Users Table Schema</h2>";
    $stmt = $conn->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $hasToken = false;
    foreach($columns as $col) {
        if ($col['Field'] == 'token') $hasToken = true;
    }
    if ($hasToken) {
        echo "<p style='color:green'>✅ Users table has 'token' column.</p>";
    } else {
        echo "<p style='color:red'>❌ Users table is MISSING 'token' column! Fixing now...</p>";
        $conn->exec("ALTER TABLE users ADD COLUMN token VARCHAR(255)");
        echo "<p style='color:green'>✅ Added 'token' column!</p>";
    }

    echo "<h2>4. API Fetch Test (Self)</h2>";
    echo "<p>If you see a JSON array of projects below, the API is working.</p>";
    echo "<textarea style='width:100%; height:200px;'>";
    $stmt = $conn->query("SELECT * FROM projects");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    echo "</textarea>";

} catch (Exception $e) {
    echo "<p style='color:red'>❌ Error: " . $e->getMessage() . "</p>";
}
?>
