<?php
// COMMUJ Admin Content Management API
// This file handles admin panel actions for content management

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'database.php';
require_once 'db_operations.php';

// Get action from request
$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

// Parse JSON body if the request can include one.
$data = array();
if ($method === 'POST' || $method === 'PUT' || $method === 'DELETE') {
    if (!empty($_POST)) {
        $data = $_POST;
    } else {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            $data = array();
        }
    }
}

// Response helper
function respond($success, $message = '', $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// ============================================
// ANNOUNCEMENTS MANAGEMENT
// ============================================

if ($action === 'getDashboardStats' && $method === 'GET') {
    respond(true, 'Dashboard stats retrieved', getAdminDashboardStats());
}

if ($action === 'getDashboardDetail' && $method === 'GET') {
    $type = isset($_GET['type']) ? $_GET['type'] : '';
    $result = getAdminDashboardDetail($type);
    respond($result['success'], $result['success'] ? 'Dashboard detail retrieved' : $result['error'], $result);
}

if ($action === 'approvePayment' && $method === 'POST') {
    $payment_id = isset($data['payment_id']) ? intval($data['payment_id']) : 0;
    if ($payment_id === 0) {
        respond(false, 'Payment ID required');
    }
    $transaction_id = 'ADMIN-PAY-' . $payment_id . '-' . time();
    $result = completePayment($payment_id, $transaction_id);
    respond($result['success'], $result['success'] ? 'Payment approved' : $result['error'], $result);
}

if ($action === 'approveDonation' && $method === 'POST') {
    $donation_id = isset($data['donation_id']) ? intval($data['donation_id']) : 0;
    if ($donation_id === 0) {
        respond(false, 'Donation ID required');
    }
    $transaction_id = 'ADMIN-DON-' . $donation_id . '-' . time();
    $result = completeDonation($donation_id, $transaction_id);
    respond($result['success'], $result['success'] ? 'Donation approved' : $result['error'], $result);
}

if ($action === 'seedSampleData' && $method === 'POST') {
    $result = seedAdminSampleData();
    respond($result['success'], $result['success'] ? 'Sample database records added' : 'Error adding sample records', $result);
}

if ($action === 'createAnnouncement' && $method === 'POST') {
    $title = isset($data['title']) ? $data['title'] : '';
    $content = isset($data['content']) ? $data['content'] : '';
    $author_id = isset($data['author_id']) ? intval($data['author_id']) : 0;
    $priority = isset($data['priority']) ? $data['priority'] : 'normal';
    $expires_at = isset($data['expires_at']) ? $data['expires_at'] : null;
    
    if (empty($title) || empty($content)) {
        respond(false, 'Title and content are required');
    }
    
    $result = createAnnouncement($title, $content, $author_id, $priority, $expires_at);
    respond($result['success'], $result['success'] ? 'Announcement created' : 'Error creating announcement', $result);
}

if ($action === 'getAnnouncements' && $method === 'GET') {
    $announcements = getActiveAnnouncements();
    respond(true, 'Announcements retrieved', $announcements);
}

if ($action === 'deleteAnnouncement' && $method === 'DELETE') {
    $announcement_id = isset($data['announcement_id']) ? intval($data['announcement_id']) : 0;
    
    if ($announcement_id === 0) {
        respond(false, 'Announcement ID required');
    }
    
    $result = deleteAnnouncement($announcement_id);
    respond($result['success'], $result['success'] ? 'Announcement deleted' : 'Error deleting announcement', $result);
}

// ============================================
// EVENTS MANAGEMENT
// ============================================

if ($action === 'createEvent' && $method === 'POST') {
    $title = isset($data['title']) ? $data['title'] : '';
    $description = isset($data['description']) ? $data['description'] : '';
    $event_date = isset($data['event_date']) ? $data['event_date'] : '';
    $location = isset($data['location']) ? $data['location'] : '';
    $organizer_id = isset($data['organizer_id']) ? $data['organizer_id'] : '';
    $capacity = isset($data['max_participants']) ? intval($data['max_participants']) : (isset($data['capacity']) ? intval($data['capacity']) : 100);
    
    if (empty($title) || empty($description) || empty($event_date)) {
        respond(false, 'Title, description, and date are required');
    }
    
    $event_data = [
        'title' => $title,
        'description' => $description,
        'event_date' => $event_date,
        'location' => $location,
        'category' => isset($data['category']) ? $data['category'] : 'general',
        'organizer_id' => $organizer_id,
        'status' => isset($data['status']) ? $data['status'] : 'upcoming',
        'max_participants' => $capacity
    ];
    
    $result = createEvent($event_data);
    respond($result['success'], $result['success'] ? 'Event created' : 'Error creating event', $result);
}

if ($action === 'getEvents' && $method === 'GET') {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
    $events = getUpcomingEvents($limit);
    respond(true, 'Events retrieved', $events);
}

if ($action === 'getEventRegistrations' && $method === 'GET') {
    $event_id = isset($_GET['event_id']) ? intval($_GET['event_id']) : 0;
    respond(true, 'Event registrations retrieved', getEventRegistrations($event_id));
}

if ($action === 'deleteEvent' && $method === 'DELETE') {
    $event_id = isset($data['event_id']) ? intval($data['event_id']) : 0;
    
    if ($event_id === 0) {
        respond(false, 'Event ID required');
    }
    
    $result = deleteEvent($event_id);
    respond($result['success'], $result['success'] ? 'Event deleted' : 'Error deleting event', $result);
}

// ============================================
// LEADERSHIP MANAGEMENT
// ============================================

if ($action === 'addLeader' && $method === 'POST') {
    $name = isset($data['name']) ? $data['name'] : '';
    $position = isset($data['position']) ? $data['position'] : '';
    $bio = isset($data['bio']) ? $data['bio'] : '';
    $description = isset($data['description']) ? $data['description'] : '';
    $email = isset($data['email']) ? $data['email'] : '';
    $phone = isset($data['phone']) ? $data['phone'] : '';
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;
    
    if (empty($name) || empty($position)) {
        respond(false, 'Name and position are required');
    }
    
    $leader_data = [
        'name' => $name,
        'position' => $position,
        'bio' => $bio,
        'description' => $description,
        'email' => $email,
        'phone' => $phone,
        'user_id' => $user_id,
        'photo_url' => isset($data['photo_url']) ? $data['photo_url'] : null
    ];
    
    $result = addPublicLeader($leader_data);
    respond($result['success'], $result['success'] ? 'Leader added' : 'Error adding leader', $result);
}

if ($action === 'getLeaders' && $method === 'GET') {
    $leaders = getPublicLeaders();
    respond(true, 'Leaders retrieved', $leaders);
}

if ($action === 'deleteLeader' && $method === 'DELETE') {
    $leader_id = isset($data['leader_id']) ? intval($data['leader_id']) : 0;
    
    if ($leader_id === 0) {
        respond(false, 'Leader ID required');
    }
    
    $result = deletePublicLeader($leader_id);
    respond($result['success'], $result['success'] ? 'Leader deleted' : 'Error deleting leader', $result);
}

// ============================================
// GALLERY MANAGEMENT
// ============================================

// ============================================
// GALLERY MANAGEMENT
// ============================================

if ($action === 'addGalleryItem' && $method === 'POST') {
    $title = isset($data['title']) ? $data['title'] : '';
    $description = isset($data['description']) ? $data['description'] : '';
    $image_url = isset($data['image_url']) ? $data['image_url'] : '';
    $uploaded_by = isset($data['uploaded_by']) ? intval($data['uploaded_by']) : 0;
    
    if (empty($title) || empty($image_url)) {
        respond(false, 'Title and image URL are required');
    }

    if (strpos($image_url, 'data:image/') === 0) {
        $saved_image = saveGalleryDataImage($image_url);
        if (!$saved_image['success']) {
            respond(false, $saved_image['error']);
        }
        $image_url = $saved_image['path'];
    }
    
    $gallery_data = [
        'title' => $title,
        'description' => $description,
        'image_url' => $image_url,
        'uploaded_by' => $uploaded_by
    ];
    
    $result = addGalleryItem($gallery_data);
    respond($result['success'], $result['success'] ? 'Gallery item added' : 'Error adding gallery item', $result);
}

function saveGalleryDataImage($data_url) {
    if (!preg_match('/^data:image\/(png|jpe?g|gif|webp);base64,/', $data_url, $matches)) {
        return ['success' => false, 'error' => 'Unsupported image format'];
    }

    $extension = strtolower($matches[1]);
    if ($extension === 'jpeg') {
        $extension = 'jpg';
    }

    $base64 = substr($data_url, strpos($data_url, ',') + 1);
    $image_data = base64_decode($base64, true);
    if ($image_data === false) {
        return ['success' => false, 'error' => 'Invalid image data'];
    }

    if (strlen($image_data) > 5 * 1024 * 1024) {
        return ['success' => false, 'error' => 'Image is too large. Please use an image under 5MB.'];
    }

    $upload_dir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'gallery';
    if (!is_dir($upload_dir) && !mkdir($upload_dir, 0755, true)) {
        return ['success' => false, 'error' => 'Could not create gallery upload folder'];
    }

    $filename = 'gallery_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $full_path = $upload_dir . DIRECTORY_SEPARATOR . $filename;

    if (file_put_contents($full_path, $image_data) === false) {
        return ['success' => false, 'error' => 'Could not save image file'];
    }

    return ['success' => true, 'path' => 'uploads/gallery/' . $filename];
}

if ($action === 'getGallery' && $method === 'GET') {
    $gallery = getGalleryItems();
    respond(true, 'Gallery items retrieved', $gallery);
}

if ($action === 'deleteGalleryItem' && $method === 'DELETE') {
    $gallery_id = isset($data['gallery_id']) ? intval($data['gallery_id']) : 0;
    
    if ($gallery_id === 0) {
        respond(false, 'Gallery ID required');
    }
    
    $result = deleteGalleryItem($gallery_id);
    respond($result['success'], $result['success'] ? 'Gallery item deleted' : 'Error deleting gallery item', $result);
}

// ============================================
// WELFARE, PRAYER TIMES, RESOURCES
// ============================================

if ($action === 'getWelfareRequests' && $method === 'GET') {
    respond(true, 'Welfare requests retrieved', getAllWelfareRequests());
}

if ($action === 'updateWelfareStatus' && $method === 'POST') {
    $request_id = isset($data['request_id']) ? intval($data['request_id']) : 0;
    $status = isset($data['status']) ? $data['status'] : '';
    $notes = isset($data['notes']) ? $data['notes'] : '';
    if ($request_id === 0 || empty($status)) {
        respond(false, 'Request ID and status are required');
    }
    $result = updateWelfareStatus($request_id, $status, $notes, isset($data['approved_by']) ? intval($data['approved_by']) : 0);
    respond($result['success'], $result['success'] ? 'Welfare request updated' : 'Error updating welfare request', $result);
}

if ($action === 'getPrayerTimes' && $method === 'GET') {
    $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    respond(true, 'Prayer times retrieved', getPrayerTimes($date));
}

if ($action === 'setPrayerTimes' && $method === 'POST') {
    $date = isset($data['date']) ? $data['date'] : date('Y-m-d');
    $times = [
        'fajr' => $data['fajr'] ?? null,
        'dhuhr' => $data['dhuhr'] ?? null,
        'asr' => $data['asr'] ?? null,
        'maghrib' => $data['maghrib'] ?? null,
        'isha' => $data['isha'] ?? null,
        'iqamah_fajr' => $data['iqamah_fajr'] ?? null,
        'iqamah_dhuhr' => $data['iqamah_dhuhr'] ?? null,
        'iqamah_asr' => $data['iqamah_asr'] ?? null,
        'iqamah_maghrib' => $data['iqamah_maghrib'] ?? null,
        'iqamah_isha' => $data['iqamah_isha'] ?? null,
        'jummah_time' => $data['jummah_time'] ?? null
    ];
    $result = setPrayerTimes($date, $times);
    respond($result['success'], $result['success'] ? 'Prayer times saved' : 'Error saving prayer times', $result);
}

if ($action === 'getResources' && $method === 'GET') {
    respond(true, 'Resources retrieved', getResources());
}

if ($action === 'addResource' && $method === 'POST') {
    $title = isset($data['title']) ? $data['title'] : '';
    $type = isset($data['resource_type']) ? $data['resource_type'] : (isset($data['type']) ? $data['type'] : '');
    if (empty($title) || empty($type)) {
        respond(false, 'Title and resource type are required');
    }
    if (isset($_FILES['resource_file']) && $_FILES['resource_file']['error'] !== UPLOAD_ERR_NO_FILE) {
        $saved_file = saveResourceUpload($_FILES['resource_file']);
        if (!$saved_file['success']) {
            respond(false, $saved_file['error']);
        }
        $data['file_path'] = $saved_file['path'];
        if (empty($data['url'])) {
            $data['url'] = $saved_file['path'];
        }
    }
    $result = addResource($data);
    respond($result['success'], $result['success'] ? 'Resource added' : 'Error adding resource', $result);
}

function saveResourceUpload($file) {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return ['success' => false, 'error' => 'Resource upload failed'];
    }

    $allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mp3', 'wav'];
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, $allowed, true)) {
        return ['success' => false, 'error' => 'This resource file type is not allowed'];
    }

    $upload_dir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'resources';
    if (!is_dir($upload_dir) && !mkdir($upload_dir, 0777, true)) {
        return ['success' => false, 'error' => 'Could not create resource upload folder'];
    }

    $safe_base = preg_replace('/[^a-zA-Z0-9_-]+/', '-', pathinfo($file['name'], PATHINFO_FILENAME));
    $filename = 'resource_' . date('Ymd_His') . '_' . ($safe_base ?: 'file') . '.' . $extension;
    $target = $upload_dir . DIRECTORY_SEPARATOR . $filename;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        return ['success' => false, 'error' => 'Could not save uploaded resource'];
    }

    return ['success' => true, 'path' => 'uploads/resources/' . $filename];
}

if ($action === 'deleteResource' && $method === 'DELETE') {
    $resource_id = isset($data['resource_id']) ? intval($data['resource_id']) : 0;
    if ($resource_id === 0) {
        respond(false, 'Resource ID required');
    }
    $result = deleteResource($resource_id);
    respond($result['success'], $result['success'] ? 'Resource deleted' : 'Error deleting resource', $result);
}

// ============================================
// HADITH MANAGEMENT
// ============================================

if ($action === 'addHadith' && $method === 'POST') {
    $arabic = isset($data['arabic']) ? $data['arabic'] : '';
    $english = isset($data['english']) ? $data['english'] : '';
    $reference = isset($data['reference']) ? $data['reference'] : '';
    $source = isset($data['source']) ? $data['source'] : '';
    $category = isset($data['category']) ? $data['category'] : '';
    $added_by = isset($data['added_by']) ? intval($data['added_by']) : 1;
    
    if (empty($arabic) || empty($english)) {
        respond(false, 'Arabic and English texts are required');
    }
    
    $hadith_data = [
        'arabic' => $arabic,
        'english' => $english,
        'reference' => $reference,
        'source' => $source,
        'category' => $category,
        'added_by' => $added_by
    ];
    
    $result = addHadith($hadith_data);
    respond($result['success'], $result['success'] ? 'Hadith added successfully' : 'Error adding hadith', $result);
}

if ($action === 'getHadiths' && $method === 'GET') {
    $hadiths = getAllHadiths();
    respond(true, 'Hadiths retrieved', $hadiths);
}

if ($action === 'getDailyHadith' && $method === 'GET') {
    $hadith = getDailyHadith();
    if ($hadith) {
        respond(true, 'Daily hadith retrieved', $hadith);
    } else {
        respond(false, 'No hadith available');
    }
}

if ($action === 'getHadithById' && $method === 'GET') {
    $hadith_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($hadith_id === 0) {
        respond(false, 'Hadith ID required');
    }
    
    $hadith = getHadithById($hadith_id);
    if ($hadith) {
        respond(true, 'Hadith retrieved', $hadith);
    } else {
        respond(false, 'Hadith not found');
    }
}

if ($action === 'updateHadith' && $method === 'PUT') {
    $hadith_id = isset($data['hadith_id']) ? intval($data['hadith_id']) : 0;
    $arabic = isset($data['arabic']) ? $data['arabic'] : '';
    $english = isset($data['english']) ? $data['english'] : '';
    $reference = isset($data['reference']) ? $data['reference'] : '';
    $source = isset($data['source']) ? $data['source'] : '';
    $category = isset($data['category']) ? $data['category'] : '';
    
    if ($hadith_id === 0 || empty($arabic) || empty($english)) {
        respond(false, 'Hadith ID and required fields are required');
    }
    
    $hadith_data = [
        'arabic' => $arabic,
        'english' => $english,
        'reference' => $reference,
        'source' => $source,
        'category' => $category
    ];
    
    $result = updateHadith($hadith_id, $hadith_data);
    respond($result['success'], $result['success'] ? 'Hadith updated successfully' : 'Error updating hadith', $result);
}

if ($action === 'deleteHadith' && $method === 'DELETE') {
    $hadith_id = isset($data['hadith_id']) ? intval($data['hadith_id']) : 0;
    
    if ($hadith_id === 0) {
        respond(false, 'Hadith ID required');
    }
    
    $result = deleteHadith($hadith_id);
    respond($result['success'], $result['success'] ? 'Hadith deleted' : 'Error deleting hadith', $result);
}

// ============================================
// DEFAULT RESPONSE
// ============================================

respond(false, 'Invalid action or method');
?>
