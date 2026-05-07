<?php
// COMMUJ Hadith Management System

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'database.php';
require_once 'db_operations.php';

// Get request action
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Handle different actions
switch($action) {
    case 'getAll':
        getAllHadithsAPI();
        break;
    case 'getDaily':
        getDailyHadithAPI();
        break;
    case 'getById':
        getHadithByIdAPI();
        break;
    case 'getToday':
        getTodayHadithAPI();
        break;
    default:
        getDailyHadithAPI();
}

// Get all hadiths from database
function getAllHadithsAPI() {
    $hadiths = getAllHadiths();
    
    echo json_encode([
        'success' => true,
        'data' => $hadiths,
        'total' => count($hadiths)
    ]);
}

// Get daily hadith from database
function getDailyHadithAPI() {
    $hadiths = getAllHadiths();
    $hadith = getDailyHadith();
    
    if ($hadith) {
        $position = 1;
        foreach ($hadiths as $index => $item) {
            if ((int)$item['id'] === (int)$hadith['id']) {
                $position = $index + 1;
                break;
            }
        }

        echo json_encode([
            'success' => true,
            'data' => $hadith,
            'position' => $position,
            'total' => count($hadiths),
            'date' => date('Y-m-d')
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'No hadith available',
            'data' => null
        ]);
    }
}

// Get hadith by ID from database
function getHadithByIdAPI() {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($id === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'ID required'
        ]);
        return;
    }
    
    $hadith = getHadithById($id);
    
    if ($hadith) {
        echo json_encode([
            'success' => true,
            'data' => $hadith
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Hadith not found'
        ]);
    }
}

// Get today's hadith from database
function getTodayHadithAPI() {
    $hadith = getDailyHadith();
    
    if ($hadith) {
        echo json_encode([
            'success' => true,
            'hadith' => $hadith,
            'date' => date('l, F j, Y')
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'No hadith available',
            'date' => date('l, F j, Y')
        ]);
    }
}

// Handle POST requests (future feature for admin)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['action']) && $data['action'] === 'add') {
        // This would be handled by admin_api.php
        echo json_encode([
            'success' => false,
            'message' => 'Use admin_api.php to add hadiths'
        ]);
    }
}

// 404 or invalid action
if (empty($action) || !isset($_GET['action'])) {
    getDailyHadithAPI();
}
?>
