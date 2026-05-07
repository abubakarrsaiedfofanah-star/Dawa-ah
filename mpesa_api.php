<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'database.php';
require_once 'db_operations.php';
require_once 'mpesa_config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];
$data = array();
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        $data = array();
    }
}

function mpesaRespond($success, $message = '', $data = null) {
    echo json_encode(array(
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ));
    exit;
}

function ensureMpesaTable() {
    $conn = getDBConnection();
    $conn->query("CREATE TABLE IF NOT EXISTS mpesa_transactions (
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");
}

function mpesaBaseUrl() {
    return MPESA_ENV === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';
}

function mpesaAccessToken() {
    $credentials = base64_encode(MPESA_CONSUMER_KEY . ':' . MPESA_CONSUMER_SECRET);
    $ch = curl_init(mpesaBaseUrl() . '/oauth/v1/generate?grant_type=client_credentials');
    curl_setopt_array($ch, array(
        CURLOPT_HTTPHEADER => array('Authorization: Basic ' . $credentials),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30
    ));
    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return array('success' => false, 'error' => $error);
    }

    $json = json_decode($response, true);
    if (!isset($json['access_token'])) {
        return array('success' => false, 'error' => $response);
    }

    return array('success' => true, 'token' => $json['access_token']);
}

function initiateStkPush($payload) {
    if (MPESA_CONSUMER_KEY === 'YOUR_DARAJA_CONSUMER_KEY' || MPESA_PASSKEY === 'YOUR_DARAJA_PASSKEY') {
        return array('success' => false, 'error' => 'Daraja credentials are not configured in mpesa_config.php');
    }

    $amount = isset($payload['amount']) ? intval(round(floatval($payload['amount']))) : 0;
    $phone = isset($payload['phone']) ? preg_replace('/\D+/', '', $payload['phone']) : '';
    $source = isset($payload['source']) && $payload['source'] === 'donation' ? 'donation' : 'payment';
    if ($amount <= 0 || strlen($phone) !== 12 || substr($phone, 0, 3) !== '254') {
        return array('success' => false, 'error' => 'Valid amount and M-Pesa phone number are required');
    }

    $transaction_id = 'MPESA-PENDING-' . time();
    if ($source === 'payment') {
        $student_id = isset($payload['student_id']) ? intval($payload['student_id']) : 0;
        if ($student_id <= 0) {
            return array('success' => false, 'error' => 'Student record is required');
        }
        $payment = recordPayment(
            $student_id,
            isset($payload['payment_type']) ? $payload['payment_type'] : 'M-Pesa Payment',
            $amount,
            date('Y-m-d'),
            'M-Pesa STK Push',
            $transaction_id,
            'Waiting for Safaricom STK callback.',
            'pending'
        );
        if (!$payment['success']) {
            return $payment;
        }
        $payment_id = intval($payment['payment_id']);
        $donation_id = null;
        $account_reference = 'COMMUJ-PAY-' . $payment_id;
    } else {
        $donation = recordDonation(
            isset($payload['donor_id']) ? intval($payload['donor_id']) : 0,
            isset($payload['donor_name']) ? $payload['donor_name'] : 'Donor',
            isset($payload['donor_email']) ? $payload['donor_email'] : 'donor@commuj.local',
            $amount,
            isset($payload['donation_type']) ? $payload['donation_type'] : 'Donation',
            isset($payload['purpose']) ? $payload['purpose'] : 'COMMUJ donation',
            'M-Pesa STK Push',
            $transaction_id,
            'pending'
        );
        if (!$donation['success']) {
            return $donation;
        }
        $payment_id = null;
        $donation_id = intval($donation['donation_id']);
        $account_reference = 'COMMUJ-DON-' . $donation_id;
    }

    $token = mpesaAccessToken();
    if (!$token['success']) {
        return array('success' => false, 'error' => 'Could not get M-Pesa token: ' . $token['error']);
    }

    $timestamp = date('YmdHis');
    $password = base64_encode(MPESA_BUSINESS_SHORT_CODE . MPESA_PASSKEY . $timestamp);
    $stkPayload = array(
        'BusinessShortCode' => MPESA_BUSINESS_SHORT_CODE,
        'Password' => $password,
        'Timestamp' => $timestamp,
        'TransactionType' => MPESA_TRANSACTION_TYPE,
        'Amount' => $amount,
        'PartyA' => $phone,
        'PartyB' => MPESA_BUSINESS_SHORT_CODE,
        'PhoneNumber' => $phone,
        'CallBackURL' => MPESA_CALLBACK_URL,
        'AccountReference' => $account_reference,
        'TransactionDesc' => 'COMMUJ payment'
    );

    $ch = curl_init(mpesaBaseUrl() . '/mpesa/stkpush/v1/processrequest');
    curl_setopt_array($ch, array(
        CURLOPT_HTTPHEADER => array(
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token['token']
        ),
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($stkPayload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30
    ));
    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);
    if ($error) {
        return array('success' => false, 'error' => $error);
    }

    $json = json_decode($response, true);
    if (!isset($json['CheckoutRequestID'])) {
        return array('success' => false, 'error' => $response);
    }

    ensureMpesaTable();
    $conn = getDBConnection();
    $status = 'pending';
    $stmt = $conn->prepare("INSERT INTO mpesa_transactions
        (checkout_request_id, merchant_request_id, account_reference, phone, amount, source_type, payment_id, donation_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param(
        "ssssdsiis",
        $json['CheckoutRequestID'],
        $json['MerchantRequestID'],
        $account_reference,
        $phone,
        $amount,
        $source,
        $payment_id,
        $donation_id,
        $status
    );
    $stmt->execute();

    return array(
        'success' => true,
        'checkout_request_id' => $json['CheckoutRequestID'],
        'merchant_request_id' => $json['MerchantRequestID'],
        'payment_id' => $payment_id,
        'donation_id' => $donation_id
    );
}

function handleMpesaCallback($payload) {
    ensureMpesaTable();
    $body = isset($payload['Body']['stkCallback']) ? $payload['Body']['stkCallback'] : null;
    if (!$body) {
        echo json_encode(array('ResultCode' => 0, 'ResultDesc' => 'Ignored'));
        exit;
    }

    $checkout = $body['CheckoutRequestID'];
    $result_code = intval($body['ResultCode']);
    $result_desc = isset($body['ResultDesc']) ? $body['ResultDesc'] : '';
    $receipt = null;

    if (isset($body['CallbackMetadata']['Item'])) {
        foreach ($body['CallbackMetadata']['Item'] as $item) {
            if (isset($item['Name']) && $item['Name'] === 'MpesaReceiptNumber') {
                $receipt = $item['Value'];
            }
        }
    }

    $conn = getDBConnection();
    $status = $result_code === 0 ? 'completed' : 'failed';
    $payload_json = json_encode($payload);
    $stmt = $conn->prepare("UPDATE mpesa_transactions
        SET status = ?, result_code = ?, result_desc = ?, mpesa_receipt = ?, callback_payload = ?
        WHERE checkout_request_id = ?");
    $stmt->bind_param("sissss", $status, $result_code, $result_desc, $receipt, $payload_json, $checkout);
    $stmt->execute();

    $tx = getMpesaTransaction($checkout);
    if ($tx && $status === 'completed') {
        if (!empty($tx['payment_id'])) {
            completePayment(intval($tx['payment_id']), $receipt);
        }
        if (!empty($tx['donation_id'])) {
            completeDonation(intval($tx['donation_id']), $receipt);
        }
    }

    echo json_encode(array('ResultCode' => 0, 'ResultDesc' => 'Callback received'));
    exit;
}

function getMpesaTransaction($checkout) {
    ensureMpesaTable();
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT * FROM mpesa_transactions WHERE checkout_request_id = ? LIMIT 1");
    $stmt->bind_param("s", $checkout);
    $stmt->execute();
    return $stmt->get_result()->fetch_assoc();
}

if ($action === 'initiateStkPush' && $method === 'POST') {
    $result = initiateStkPush($data);
    mpesaRespond($result['success'], $result['success'] ? 'STK Push sent' : $result['error'], $result);
}

if ($action === 'callback' && $method === 'POST') {
    handleMpesaCallback($data);
}

if ($action === 'getTransactionStatus' && $method === 'GET') {
    $checkout = isset($_GET['checkout_request_id']) ? $_GET['checkout_request_id'] : '';
    if ($checkout === '') {
        mpesaRespond(false, 'Checkout request ID required');
    }
    mpesaRespond(true, 'Transaction status retrieved', getMpesaTransaction($checkout));
}

mpesaRespond(false, 'Unsupported M-Pesa action');
?>
