<?php
// COMMUJ Database Configuration and Connection

// Database Configuration
// XAMPP defaults are root with an empty password. Hosting can override with env vars.
define('DB_HOST', getenv('COMMUJ_DB_HOST') ?: 'localhost');
define('DB_USER', getenv('COMMUJ_DB_USER') ?: 'root');
define('DB_PASSWORD', getenv('COMMUJ_DB_PASSWORD') ?: '');
define('DB_NAME', getenv('COMMUJ_DB_NAME') ?: 'commuj_db');

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Create database if it doesn't exist
$createDB = "CREATE DATABASE IF NOT EXISTS " . DB_NAME;
if ($conn->query($createDB) === TRUE) {
    // Database created or already exists
} else {
    die("Error creating database: " . $conn->error);
}

// Select the database
$conn->select_db(DB_NAME);

// Set charset to utf8
$conn->set_charset("utf8");

// USERS TABLE - For authentication
$sql_users = "CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'executive', 'imam', 'finance', 'admin') DEFAULT 'student',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
)";

// STUDENTS TABLE - Detailed student information
$sql_students = "CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    gender ENUM('male', 'female', 'other'),
    nationality VARCHAR(100),
    course VARCHAR(100),
    year_of_study VARCHAR(50),
    degree_type ENUM('diploma', 'degree'),
    home_address TEXT,
    emergency_contact VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    local_guardian VARCHAR(100),
    local_guardian_phone VARCHAR(20),
    passport_photo VARCHAR(255),
    membership_status ENUM('active', 'pending', 'inactive') DEFAULT 'pending',
    joined_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)";

// PRAYER_TIMES TABLE
$sql_prayer_times = "CREATE TABLE IF NOT EXISTS prayer_times (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL UNIQUE,
    fajr TIME NOT NULL,
    dhuhr TIME NOT NULL,
    asr TIME NOT NULL,
    maghrib TIME NOT NULL,
    isha TIME NOT NULL,
    iqamah_fajr TIME,
    iqamah_dhuhr TIME,
    iqamah_asr TIME,
    iqamah_maghrib TIME,
    iqamah_isha TIME,
    jummah_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";

// EVENTS TABLE
$sql_events = "CREATE TABLE IF NOT EXISTS events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    location VARCHAR(255),
    category VARCHAR(100),
    organizer_id INT,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    max_participants INT,
    current_participants INT DEFAULT 0,
    poster_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
)";

// EVENT_REGISTRATIONS TABLE
$sql_event_registrations = "CREATE TABLE IF NOT EXISTS event_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    student_id INT NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('registered', 'attended', 'cancelled') DEFAULT 'registered',
    UNIQUE KEY unique_registration (event_id, student_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
)";

// ANNOUNCEMENTS TABLE
$sql_announcements = "CREATE TABLE IF NOT EXISTS announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
)";

// WELFARE_REQUESTS TABLE
$sql_welfare = "CREATE TABLE IF NOT EXISTS welfare_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount_needed DECIMAL(10, 2),
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    approved_by INT,
    approval_date TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
)";

// PAYMENTS_DUES TABLE
$sql_payments = "CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    payment_type VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE,
    paid_date DATE NULL,
    status ENUM('pending', 'completed', 'late', 'waived') DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
)";

// DONATIONS TABLE
$sql_donations = "CREATE TABLE IF NOT EXISTS donations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donor_id INT,
    donor_name VARCHAR(100),
    donor_email VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    donation_type VARCHAR(100),
    purpose TEXT,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    receipt_issued BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE SET NULL
)";

// MPESA TRANSACTIONS TABLE
$sql_mpesa_transactions = "CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    checkout_request_id VARCHAR(100) UNIQUE,
    merchant_request_id VARCHAR(100),
    account_reference VARCHAR(100),
    phone VARCHAR(20),
    amount DECIMAL(10, 2) NOT NULL,
    source_type ENUM('payment', 'donation') NOT NULL,
    payment_id INT NULL,
    donation_id INT NULL,
    mpesa_receipt VARCHAR(100),
    result_code INT NULL,
    result_desc VARCHAR(255),
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    callback_payload JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE SET NULL
)";

// LEADERSHIP_ROLES TABLE
$sql_leadership = "CREATE TABLE IF NOT EXISTS leadership_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
)";

// HADITHS TABLE
$sql_hadiths = "CREATE TABLE IF NOT EXISTS hadiths (
    id INT PRIMARY KEY AUTO_INCREMENT,
    arabic_text TEXT NOT NULL,
    english_translation TEXT NOT NULL,
    reference VARCHAR(255) NOT NULL,
    source VARCHAR(100),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";

// VOLUNTEER_OPPORTUNITIES TABLE
$sql_volunteer = "CREATE TABLE IF NOT EXISTS volunteer_opportunities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    required_hours INT,
    duration VARCHAR(100),
    start_date DATE,
    end_date DATE,
    created_by INT,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
)";

// VOLUNTEER_REGISTRATIONS TABLE
$sql_volunteer_reg = "CREATE TABLE IF NOT EXISTS volunteer_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    volunteer_opportunity_id INT NOT NULL,
    student_id INT NOT NULL,
    hours_completed INT DEFAULT 0,
    status ENUM('registered', 'in-progress', 'completed') DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    UNIQUE KEY unique_volunteer_reg (volunteer_opportunity_id, student_id),
    FOREIGN KEY (volunteer_opportunity_id) REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
)";

// RESOURCES TABLE
$sql_resources = "CREATE TABLE IF NOT EXISTS resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(100),
    file_path VARCHAR(255),
    url VARCHAR(500),
    category VARCHAR(100),
    uploaded_by INT,
    is_public BOOLEAN DEFAULT TRUE,
    downloads INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
)";

// ISLAMIC_CALENDAR TABLE
$sql_islamic_calendar = "CREATE TABLE IF NOT EXISTS islamic_calendar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hijri_date VARCHAR(50) UNIQUE NOT NULL,
    gregorian_date DATE UNIQUE NOT NULL,
    event_name VARCHAR(255),
    event_description TEXT,
    is_holiday BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

// MESSAGES TABLE
$sql_messages = "CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
)";

// AUDIT_LOG TABLE
$sql_audit = "CREATE TABLE IF NOT EXISTS audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
)";

// Execute all CREATE TABLE queries
$tables = array(
    "users" => $sql_users,
    "students" => $sql_students,
    "prayer_times" => $sql_prayer_times,
    "events" => $sql_events,
    "event_registrations" => $sql_event_registrations,
    "announcements" => $sql_announcements,
    "welfare_requests" => $sql_welfare,
    "payments" => $sql_payments,
    "donations" => $sql_donations,
    "mpesa_transactions" => $sql_mpesa_transactions,
    "leadership_roles" => $sql_leadership,
    "hadiths" => $sql_hadiths,
    "volunteer_opportunities" => $sql_volunteer,
    "volunteer_registrations" => $sql_volunteer_reg,
    "resources" => $sql_resources,
    "islamic_calendar" => $sql_islamic_calendar,
    "messages" => $sql_messages,
    "audit_log" => $sql_audit
);

$created_tables = array();
$failed_tables = array();

foreach ($tables as $table_name => $sql) {
    if ($conn->query($sql) === TRUE) {
        $created_tables[] = $table_name;
    } else {
        $failed_tables[] = array('table' => $table_name, 'error' => $conn->error);
    }
}

// Function to get database connection
function getDBConnection() {
    global $conn;
    return $conn;
}

// Function to execute query
function executeQuery($sql) {
    $conn = getDBConnection();
    $result = $conn->query($sql);
    return $result;
}

// Function to fetch all results
function fetchAll($sql) {
    $result = executeQuery($sql);
    $rows = array();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
    }
    return $rows;
}

// Function to fetch one result
function fetchOne($sql) {
    $result = executeQuery($sql);
    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    return null;
}

// Function to insert data
function insertData($table, $data) {
    $conn = getDBConnection();
    $columns = implode(", ", array_keys($data));
    $values = implode("', '", array_values($data));
    $sql = "INSERT INTO $table ($columns) VALUES ('$values')";
    
    if ($conn->query($sql) === TRUE) {
        return $conn->insert_id;
    } else {
        return false;
    }
}

// Function to update data
function updateData($table, $data, $where) {
    $conn = getDBConnection();
    $set = "";
    foreach ($data as $key => $value) {
        $set .= "$key = '$value', ";
    }
    $set = rtrim($set, ", ");
    $sql = "UPDATE $table SET $set WHERE $where";
    
    return $conn->query($sql);
}

// Function to delete data
function deleteData($table, $where) {
    $conn = getDBConnection();
    $sql = "DELETE FROM $table WHERE $where";
    return $conn->query($sql);
}

// Function to get last error
function getLastError() {
    $conn = getDBConnection();
    return $conn->error;
}

// Display database status (for admin/setup page)
function getDatabaseStatus() {
    global $created_tables, $failed_tables;

    return array(
        'created_tables' => $created_tables,
        'failed_tables' => $failed_tables,
        'total_tables' => count($created_tables),
        'database_name' => DB_NAME,
        'status' => count($failed_tables) == 0 ? 'Ready' : 'Partial Failure'
    );
}

?>
