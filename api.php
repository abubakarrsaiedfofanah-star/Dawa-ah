<?php
// COMMUJ Database API Endpoints

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'database.php';
require_once 'db_operations.php';

// Get action from request
$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

// Parse JSON body if POST/PUT
$data = array();
if ($method === 'POST' || $method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
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
// USER ENDPOINTS
// ============================================

if ($action === 'registerUser' && $method === 'POST') {
    $username = isset($data['username']) ? $data['username'] : '';
    $email = isset($data['email']) ? $data['email'] : '';
    $password = isset($data['password']) ? $data['password'] : '';
    $role = isset($data['role']) ? $data['role'] : 'student';
    
    if (empty($username) || empty($email) || empty($password)) {
        respond(false, 'Missing required fields');
    }
    
    $result = registerUser($username, $email, $password, $role);
    respond($result['success'], $result['success'] ? 'User registered' : $result['error'], $result);
}

if ($action === 'loginUser' && $method === 'POST') {
    $username = isset($data['username']) ? $data['username'] : '';
    $password = isset($data['password']) ? $data['password'] : '';
    
    if (empty($username) || empty($password)) {
        respond(false, 'Username and password required');
    }
    
    $result = loginUser($username, $password);
    respond($result['success'], $result['success'] ? 'Login successful' : $result['error'], $result['user'] ?? null);
}

if ($action === 'getUser' && $method === 'GET') {
    $user_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    
    if ($user_id === 0) {
        respond(false, 'User ID required');
    }
    
    $user = getUserById($user_id);
    if ($user) {
        unset($user['password']); // Don't send password
        respond(true, 'User found', $user);
    } else {
        respond(false, 'User not found');
    }
}

// ============================================
// STUDENT ENDPOINTS
// ============================================

if ($action === 'registerStudent' && $method === 'POST') {
    $user_id = isset($data['user_id']) ? intval($data['user_id']) : 0;
    
    if ($user_id === 0) {
        respond(false, 'User ID required');
    }
    
    $result = registerStudent($user_id, $data);
    respond($result['success'], $result['success'] ? 'Student registered' : $result['error'], $result);
}

if ($action === 'getStudent' && $method === 'GET') {
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    
    if ($user_id === 0) {
        respond(false, 'User ID required');
    }
    
    $student = getStudentByUserId($user_id);
    if ($student) {
        respond(true, 'Student found', $student);
    } else {
        respond(false, 'Student not found');
    }
}

if ($action === 'getStudentByIdentifier' && $method === 'GET') {
    $identifier = isset($_GET['identifier']) ? $_GET['identifier'] : '';
    if (empty($identifier)) {
        respond(false, 'Identifier required');
    }

    $student = getStudentByIdentifier($identifier);
    if ($student) {
        respond(true, 'Student found', $student);
    } else {
        respond(false, 'Student not found');
    }
}

if ($action === 'ensureStudentRecord' && $method === 'POST') {
    $result = ensureStudentRecord($data);
    respond($result['success'], $result['success'] ? 'Student record ready' : $result['error'], $result);
}

if ($action === 'updateStudentProfile' && $method === 'POST') {
    $student_db_id = isset($data['student_db_id']) ? intval($data['student_db_id']) : 0;
    if ($student_db_id === 0) {
        respond(false, 'Student database ID required');
    }

    $result = updateStudentProfile($student_db_id, $data);
    respond($result['success'], $result['success'] ? 'Profile updated' : $result['error'], $result);
}

if ($action === 'getAllStudents' && $method === 'GET') {
    $students = getAllStudents();
    respond(true, 'Students retrieved', $students);
}

// ============================================
// EVENT ENDPOINTS
// ============================================

if ($action === 'createEvent' && $method === 'POST') {
    $result = createEvent($data);
    respond($result['success'], $result['success'] ? 'Event created' : $result['error'], $result);
}

if ($action === 'getUpcomingEvents' && $method === 'GET') {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
    $events = getUpcomingEvents($limit);
    respond(true, 'Events retrieved', $events);
}

if ($action === 'registerEvent' && $method === 'POST') {
    $event_id = isset($data['event_id']) ? intval($data['event_id']) : 0;
    $student_id = isset($data['student_id']) ? intval($data['student_id']) : 0;
    
    if ($event_id === 0 || $student_id === 0) {
        respond(false, 'Event ID and Student ID required');
    }
    
    $result = registerEventAttendee($event_id, $student_id);
    respond($result['success'], $result['success'] ? 'Registered for event' : $result['error'], $result);
}

// ============================================
// PRAYER TIMES ENDPOINTS
// ============================================

if ($action === 'getPrayerTimes' && $method === 'GET') {
    $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    $prayer_times = getPrayerTimes($date);
    
    if ($prayer_times) {
        respond(true, 'Prayer times retrieved', $prayer_times);
    } else {
        respond(false, 'Prayer times not found for this date');
    }
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
    respond($result['success'], $result['success'] ? 'Prayer times saved' : $result['error'], $result);
}

// ============================================
// WELFARE ENDPOINTS
// ============================================

if ($action === 'createWelfareRequest' && $method === 'POST') {
    $student_id = isset($data['student_id']) ? intval($data['student_id']) : 0;
    $category = isset($data['category']) ? $data['category'] : '';
    $description = isset($data['description']) ? $data['description'] : '';
    $amount = isset($data['amount']) ? floatval($data['amount']) : 0;
    
    if ($student_id === 0 || empty($category) || empty($description)) {
        respond(false, 'Missing required fields');
    }
    
    $result = createWelfareRequest($student_id, $category, $description, $amount);
    respond($result['success'], $result['success'] ? 'Welfare request created' : $result['error'], $result);
}

if ($action === 'getPendingWelfare' && $method === 'GET') {
    $requests = getPendingWelfareRequests();
    respond(true, 'Welfare requests retrieved', $requests);
}

if ($action === 'approveWelfare' && $method === 'POST') {
    $request_id = isset($data['request_id']) ? intval($data['request_id']) : 0;
    $approved_by = isset($data['approved_by']) ? intval($data['approved_by']) : 0;
    $notes = isset($data['notes']) ? $data['notes'] : '';
    
    if ($request_id === 0 || $approved_by === 0) {
        respond(false, 'Request ID and Approved By required');
    }
    
    $result = approveWelfareRequest($request_id, $approved_by, $notes);
    respond($result['success'], $result['success'] ? 'Welfare approved' : $result['error'], $result);
}

// ============================================
// PAYMENT ENDPOINTS
// ============================================

if ($action === 'recordPayment' && $method === 'POST') {
    $student_id = isset($data['student_id']) ? intval($data['student_id']) : 0;
    $payment_type = isset($data['payment_type']) ? $data['payment_type'] : '';
    $amount = isset($data['amount']) ? floatval($data['amount']) : 0;
    $due_date = isset($data['due_date']) ? $data['due_date'] : '';
    $payment_method = isset($data['payment_method']) ? $data['payment_method'] : null;
    $transaction_id = isset($data['transaction_id']) ? $data['transaction_id'] : null;
    $notes = isset($data['notes']) ? $data['notes'] : null;
    
    if ($student_id === 0 || empty($payment_type) || $amount === 0 || empty($transaction_id)) {
        respond(false, 'Missing required fields');
    }
    
    $result = recordPayment($student_id, $payment_type, $amount, $due_date, $payment_method, $transaction_id, $notes);
    respond($result['success'], $result['success'] ? 'Payment recorded' : $result['error'], $result);
}

if ($action === 'completePayment' && $method === 'POST') {
    $payment_id = isset($data['payment_id']) ? intval($data['payment_id']) : 0;
    $transaction_id = isset($data['transaction_id']) ? $data['transaction_id'] : null;
    
    if ($payment_id === 0) {
        respond(false, 'Payment ID required');
    }
    
    $result = completePayment($payment_id, $transaction_id);
    respond($result['success'], $result['success'] ? 'Payment completed' : $result['error'], $result);
}

// ============================================
// DONATION ENDPOINTS
// ============================================

if ($action === 'recordDonation' && $method === 'POST') {
    $donor_id = isset($data['donor_id']) ? intval($data['donor_id']) : null;
    $donor_name = isset($data['donor_name']) ? $data['donor_name'] : '';
    $donor_email = isset($data['donor_email']) ? $data['donor_email'] : '';
    $amount = isset($data['amount']) ? floatval($data['amount']) : 0;
    $donation_type = isset($data['donation_type']) ? $data['donation_type'] : '';
    $purpose = isset($data['purpose']) ? $data['purpose'] : '';
    $payment_method = isset($data['payment_method']) ? $data['payment_method'] : null;
    $transaction_id = isset($data['transaction_id']) ? $data['transaction_id'] : null;
    
    if (empty($donor_name) || empty($donor_email) || $amount === 0 || empty($transaction_id)) {
        respond(false, 'Missing required fields');
    }
    
    $result = recordDonation($donor_id, $donor_name, $donor_email, $amount, $donation_type, $purpose, $payment_method, $transaction_id);
    respond($result['success'], $result['success'] ? 'Donation recorded' : $result['error'], $result);
}

if ($action === 'getDonationStats' && $method === 'GET') {
    $year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
    $stats = getTotalDonations($year);
    respond(true, 'Donation stats retrieved', $stats);
}

// ============================================
// LEADERSHIP ENDPOINTS
// ============================================

if ($action === 'assignLeadership' && $method === 'POST') {
    $student_id = isset($data['student_id']) ? intval($data['student_id']) : 0;
    $position = isset($data['position']) ? $data['position'] : '';
    $department = isset($data['department']) ? $data['department'] : '';
    $start_date = isset($data['start_date']) ? $data['start_date'] : '';
    
    if ($student_id === 0 || empty($position) || empty($start_date)) {
        respond(false, 'Missing required fields');
    }
    
    $result = assignLeadershipRole($student_id, $position, $department, $start_date);
    respond($result['success'], $result['success'] ? 'Leadership role assigned' : $result['error'], $result);
}

if ($action === 'getLeadership' && $method === 'GET') {
    $leadership = getCurrentLeadership();
    respond(true, 'Leadership retrieved', $leadership);
}

// ============================================
// ANNOUNCEMENT ENDPOINTS
// ============================================

if ($action === 'createAnnouncement' && $method === 'POST') {
    $title = isset($data['title']) ? $data['title'] : '';
    $content = isset($data['content']) ? $data['content'] : '';
    $author_id = isset($data['author_id']) ? intval($data['author_id']) : 0;
    $priority = isset($data['priority']) ? $data['priority'] : 'medium';
    $expires_at = isset($data['expires_at']) ? $data['expires_at'] : null;
    
    if (empty($title) || empty($content) || $author_id === 0) {
        respond(false, 'Missing required fields');
    }
    
    $result = createAnnouncement($title, $content, $author_id, $priority, $expires_at);
    respond($result['success'], $result['success'] ? 'Announcement created' : $result['error'], $result);
}

if ($action === 'getAnnouncements' && $method === 'GET') {
    $announcements = getActiveAnnouncements();
    respond(true, 'Announcements retrieved', $announcements);
}

// ============================================
// VOLUNTEER ENDPOINTS
// ============================================

if ($action === 'createVolunteerOp' && $method === 'POST') {
    $title = isset($data['title']) ? $data['title'] : '';
    $description = isset($data['description']) ? $data['description'] : '';
    $required_hours = isset($data['required_hours']) ? intval($data['required_hours']) : 0;
    $start_date = isset($data['start_date']) ? $data['start_date'] : '';
    $end_date = isset($data['end_date']) ? $data['end_date'] : '';
    $created_by = isset($data['created_by']) ? intval($data['created_by']) : 0;
    
    if (empty($title) || $required_hours === 0 || $created_by === 0) {
        respond(false, 'Missing required fields');
    }
    
    $result = createVolunteerOpportunity($title, $description, $required_hours, $start_date, $end_date, $created_by);
    respond($result['success'], $result['success'] ? 'Volunteer opportunity created' : $result['error'], $result);
}

if ($action === 'registerVolunteer' && $method === 'POST') {
    $opportunity_id = isset($data['opportunity_id']) ? intval($data['opportunity_id']) : 0;
    $student_id = isset($data['student_id']) ? intval($data['student_id']) : 0;
    
    if ($opportunity_id === 0 || $student_id === 0) {
        respond(false, 'Opportunity ID and Student ID required');
    }
    
    $result = registerVolunteer($opportunity_id, $student_id);
    respond($result['success'], $result['success'] ? 'Volunteer registered' : $result['error'], $result);
}

// ============================================
// DATABASE STATUS
// ============================================

if ($action === 'dbStatus' && $method === 'GET') {
    $status = getDatabaseStatus();
    respond(true, 'Database status retrieved', $status);
}

// Default response
respond(false, 'Invalid action or method');

?>
