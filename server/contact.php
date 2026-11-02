<?php
/**
 * OPTIONAL contact-form backend for PHP / cPanel hosting.
 *
 * 1. Upload this file to your web root as /api/contact.php
 * 2. Set in .env before building:
 *      VITE_CONTACT_PROVIDER=custom
 *      VITE_CONTACT_ENDPOINT=/api/contact.php
 * 3. Make sure the hosting account can send mail (PHP mail() / SMTP).
 *
 * Receives JSON {name, email, message, language} and answers {"ok": true|false}.
 */
declare(strict_types=1);

const TO_EMAIL   = 'info@advancedetailingco.com';
const FROM_EMAIL = 'no-reply@advancedetailingco.com'; // must be a mailbox on your domain

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

// Basic rate-limit: 1 message per 30 s per session
session_start();
if (isset($_SESSION['last']) && time() - $_SESSION['last'] < 30) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'rate']);
    exit;
}

$data    = json_decode(file_get_contents('php://input') ?: '', true) ?: [];
$name    = trim((string)($data['name'] ?? ''));
$email   = trim((string)($data['email'] ?? ''));
$message = trim((string)($data['message'] ?? ''));
$lang    = preg_replace('/[^a-z]/', '', (string)($data['language'] ?? 'sq'));

if (mb_strlen($name) < 2 || mb_strlen($name) > 120 || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($message) < 10 || mb_strlen($message) > 4000) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'validation']);
    exit;
}

$clean   = fn(string $s) => str_replace(["\r", "\n"], ' ', $s); // header-injection guard
$subject = '=?UTF-8?B?' . base64_encode('Mesazh i ri nga faqja — ' . $clean($name)) . '?=';
$body    = "Emri: {$name}\nEmail: {$email}\nGjuha: {$lang}\n\n{$message}\n";
$headers = implode("\r\n", [
    'From: ADVANCE DETAILING CO. <' . FROM_EMAIL . '>',
    'Reply-To: ' . $clean($email),
    'Content-Type: text/plain; charset=UTF-8',
]);

$sent = mail(TO_EMAIL, $subject, $body, $headers);
if ($sent) $_SESSION['last'] = time();
http_response_code($sent ? 200 : 500);
echo json_encode(['ok' => $sent]);
