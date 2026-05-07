<?php
// Replace these sandbox values with your real Safaricom Daraja app details.
// Callback URL must be publicly reachable; plain localhost cannot receive Safaricom callbacks.
define('MPESA_ENV', 'sandbox'); // sandbox or production
define('MPESA_CONSUMER_KEY', 'YOUR_DARAJA_CONSUMER_KEY');
define('MPESA_CONSUMER_SECRET', 'YOUR_DARAJA_CONSUMER_SECRET');
define('MPESA_BUSINESS_SHORT_CODE', '174379');
define('MPESA_PASSKEY', 'YOUR_DARAJA_PASSKEY');
define('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline');
define('MPESA_CALLBACK_URL', 'https://your-domain.com/comahs/mpesa_api.php?action=callback');
?>
