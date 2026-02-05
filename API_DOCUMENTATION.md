# API Documentation

Complete API reference untuk WhatsApp SaaS Platform.

## Base URL

```
http://localhost/api
```

Untuk production, ganti dengan domain Anda:
```
https://your-domain.com/api
```

## Authentication

Semua endpoint (kecuali register dan login) memerlukan API Key di header:

```
x-api-key: your-api-key-here
```

## Response Format

Semua response menggunakan format JSON:

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

## Endpoints

### 1. Authentication

#### 1.1 Register User

Create new user account.

**Endpoint:** `POST /api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "company_name": "Acme Corp",
  "plan_type": "business"
}
```

**Parameters:**
- `email` (required): User email address
- `password` (required): Password (min 8 characters)
- `full_name` (optional): User's full name
- `company_name` (optional): Company name
- `plan_type` (optional): Plan type - `starter`, `business`, or `enterprise` (default: `starter`)

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "api_key": "a1b2c3d4e5f6g7h8i9j0...",
    "full_name": "John Doe",
    "plan_type": "business",
    "max_phone_numbers": 10,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "full_name": "John Doe",
    "plan_type": "business"
  }'
```

---

#### 1.2 Login

Login with existing credentials.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "api_key": "a1b2c3d4e5f6g7h8i9j0...",
    "plan_type": "business"
  }
}
```

---

#### 1.3 Get User Profile

Get current user profile and statistics.

**Endpoint:** `GET /api/user/profile`

**Headers:**
```
x-api-key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "company_name": "Acme Corp",
    "plan_type": "business",
    "status": "active",
    "total_phone_numbers": 3,
    "connected_phones": 2,
    "total_messages_sent_today": 150,
    "total_messages_received_today": 75,
    "created_at": "2024-01-01T00:00:00.000Z",
    "last_login": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 2. Phone Number Management

#### 2.1 Create Phone Number

Create new WhatsApp instance.

**Endpoint:** `POST /api/phone-numbers/create`

**Headers:**
```
x-api-key: your-api-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "display_name": "Customer Service",
  "webhook_url": "https://yourapp.com/webhook"
}
```

**Parameters:**
- `display_name` (optional): Friendly name for this phone number
- `webhook_url` (optional): Custom webhook URL for receiving events

**Response:**
```json
{
  "success": true,
  "message": "Phone number instance created successfully",
  "phone_number": {
    "id": 1,
    "instance_name": "user_1_1704067200000_a1b2c3d4",
    "token": "xyz789abc123def456...",
    "display_name": "Customer Service",
    "status": "qr_ready",
    "qr_code": "data:image/png;base64,iVBORw0KG...",
    "qr_expires_at": "2024-01-01T10:05:00.000Z",
    "server": "http://evolution-api-1:8080"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost/api/phone-numbers/create \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"display_name": "Customer Service"}'
```

---

#### 2.2 List Phone Numbers

Get all phone numbers for current user.

**Endpoint:** `GET /api/phone-numbers`

**Headers:**
```
x-api-key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "phone_numbers": [
    {
      "id": 1,
      "instance_name": "user_1_1704067200000_a1b2c3d4",
      "token": "xyz789abc...",
      "phone_number": "6281234567890",
      "display_name": "Customer Service",
      "status": "connected",
      "server_instance": "http://evolution-api-1:8080",
      "last_connected_at": "2024-01-15T08:00:00.000Z",
      "is_active": true,
      "messages_sent_today": 50,
      "messages_received_today": 25,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### 2.3 Get QR Code

Get QR code for scanning with WhatsApp.

**Endpoint:** `GET /api/phone-numbers/:id/qr`

**Headers:**
```
x-api-key: your-api-key
```

**Parameters:**
- `:id` - Phone number ID

**Response:**
```json
{
  "success": true,
  "qr_code": "data:image/png;base64,iVBORw0KG...",
  "expires_at": "2024-01-01T10:05:00.000Z",
  "status": "qr_ready"
}
```

**Example:**
```bash
curl -X GET http://localhost/api/phone-numbers/1/qr \
  -H "x-api-key: your-api-key"
```

---

#### 2.4 Get Phone Status

Get current status of phone number.

**Endpoint:** `GET /api/phone-numbers/:id/status`

**Response:**
```json
{
  "success": true,
  "instance_name": "user_1_1704067200000_a1b2c3d4",
  "status": "connected",
  "phone_number": "6281234567890",
  "last_connected_at": "2024-01-15T08:00:00.000Z",
  "details": {
    "state": "open",
    "statusReason": 0
  }
}
```

**Status Values:**
- `created` - Instance created, waiting for QR scan
- `qr_ready` - QR code available
- `connecting` - Attempting to connect
- `connected` / `open` - Successfully connected
- `close` / `disconnected` - Disconnected
- `error` - Error occurred

---

#### 2.5 Delete Phone Number

Delete phone number instance.

**Endpoint:** `DELETE /api/phone-numbers/:id`

**Response:**
```json
{
  "success": true,
  "message": "Phone number deleted successfully"
}
```

---

### 3. Messaging

#### 3.1 Send Text Message

Send text message via WhatsApp.

**Endpoint:** `POST /api/messages/send-text`

**Headers:**
```
x-api-key: your-api-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "xyz789abc123...",
  "number": "628123456789",
  "text": "Hello from WhatsApp API!"
}
```

**Parameters:**
- `token` (required): Phone number token
- `number` (required): Recipient phone number (with country code)
- `text` (required): Message text

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "message_id": "3EB0ABC123DEF456",
  "data": {
    "key": {
      "remoteJid": "628123456789@s.whatsapp.net",
      "fromMe": true,
      "id": "3EB0ABC123DEF456"
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost/api/messages/send-text \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "xyz789abc123...",
    "number": "628123456789",
    "text": "Hello!"
  }'
```

---

#### 3.2 Send Media Message

Send media (image, video, audio, document) via WhatsApp.

**Endpoint:** `POST /api/messages/send-media`

**Request Body:**
```json
{
  "token": "xyz789abc123...",
  "number": "628123456789",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Check this out!",
  "mediaType": "image"
}
```

**Parameters:**
- `token` (required): Phone number token
- `number` (required): Recipient phone number
- `mediaUrl` (required): Public URL of media file
- `caption` (optional): Caption for media
- `mediaType` (optional): Type of media - `image`, `video`, `audio`, `document` (default: `image`)

**Response:**
```json
{
  "success": true,
  "message": "Media sent successfully",
  "message_id": "3EB0ABC123DEF456"
}
```

**Supported Media Types:**
- `image` - JPG, PNG, GIF
- `video` - MP4, AVI, MOV
- `audio` - MP3, OGG, AAC
- `document` - PDF, DOCX, XLSX, etc

---

### 4. Statistics

#### 4.1 Get Statistics

Get message statistics for phone numbers.

**Endpoint:** `GET /api/statistics`

**Query Parameters:**
- `phone_number_id` (optional): Filter by specific phone number
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `limit` (optional): Number of records (default: 100)

**Example:**
```bash
curl -X GET "http://localhost/api/statistics?start_date=2024-01-01&end_date=2024-01-31" \
  -H "x-api-key: your-api-key"
```

**Response:**
```json
{
  "success": true,
  "statistics": [
    {
      "phone_number_id": 1,
      "display_name": "Customer Service",
      "phone_number": "6281234567890",
      "date": "2024-01-15",
      "messages_sent": 50,
      "messages_received": 25,
      "messages_failed": 0,
      "media_sent": 10,
      "media_received": 5
    }
  ],
  "totals": {
    "messages_sent": 150,
    "messages_received": 75,
    "messages_failed": 0,
    "media_sent": 30,
    "media_received": 15
  },
  "count": 15
}
```

---

#### 4.2 Get Dashboard

Get dashboard summary with all stats.

**Endpoint:** `GET /api/dashboard`

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "company_name": "Acme Corp",
    "plan_type": "business",
    "status": "active",
    "total_phone_numbers": 3,
    "connected_phones": 2,
    "total_messages_sent_today": 150,
    "total_messages_received_today": 75,
    "created_at": "2024-01-01T00:00:00.000Z",
    "last_login": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 5. Webhooks

Your application can receive real-time updates via webhooks.

#### Webhook Configuration

Set webhook URL when creating phone number:

```json
{
  "display_name": "Customer Service",
  "webhook_url": "https://yourapp.com/webhook"
}
```

#### Webhook Events

Your webhook will receive POST requests with following events:

**1. Connection Update**
```json
{
  "event": "connection.update",
  "instance": "user_1_1704067200000_a1b2c3d4",
  "data": {
    "state": "connected",
    "phoneNumber": "6281234567890"
  }
}
```

**2. Message Received**
```json
{
  "event": "messages.upsert",
  "instance": "user_1_1704067200000_a1b2c3d4",
  "data": {
    "key": {
      "remoteJid": "628123456789@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0ABC123DEF456"
    },
    "message": {
      "conversation": "Hello!"
    },
    "messageTimestamp": 1704067200
  }
}
```

**3. QR Code Updated**
```json
{
  "event": "qrcode.updated",
  "instance": "user_1_1704067200000_a1b2c3d4",
  "data": {
    "qrcode": "data:image/png;base64,..."
  }
}
```

#### Webhook Response

Your webhook should respond with HTTP 200 status code:

```
HTTP/1.1 200 OK
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Account suspended or limit reached |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Rate Limits

- API requests: 100 requests per 15 minutes per API key
- Login attempts: 5 attempts per 15 minutes per IP
- Message sending: Based on your plan

---

## Plan Limits

| Plan | Max Phone Numbers | Max Messages/Day |
|------|-------------------|------------------|
| Starter | 3 | 1,000 |
| Business | 10 | 5,000 |
| Enterprise | 50 | 50,000 |

---

## Phone Number Format

Phone numbers should include country code without '+' or '00':

✅ Correct:
- `628123456789` (Indonesia)
- `12025551234` (USA)
- `447911123456` (UK)

❌ Incorrect:
- `+628123456789`
- `0628123456789`
- `08123456789`

The API will automatically format Indonesian numbers (starting with '0') to include country code '62'.

---

## Best Practices

1. **Store API Key securely** - Never expose in client-side code
2. **Use webhooks** - For real-time updates instead of polling
3. **Handle rate limits** - Implement exponential backoff
4. **Monitor phone status** - Check status before sending messages
5. **Validate phone numbers** - Ensure proper format before sending
6. **Error handling** - Always check response status
7. **Logging** - Log all API interactions for debugging

---

## Example Integration (Node.js)

```javascript
const axios = require('axios');

const API_URL = 'http://localhost/api';
const API_KEY = 'your-api-key-here';
const TOKEN = 'your-phone-token-here';

// Send text message
async function sendMessage(number, text) {
  try {
    const response = await axios.post(
      `${API_URL}/messages/send-text`,
      {
        token: TOKEN,
        number: number,
        text: text
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Send message
sendMessage('628123456789', 'Hello from API!');
```

---

## Support

For questions or issues:
- Check logs: `docker-compose logs -f saas-api`
- Review documentation
- Test endpoints with provided test script
