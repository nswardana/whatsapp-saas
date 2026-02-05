# WhatsApp SaaS API - Multi-Tenancy Platform

Platform SaaS untuk WhatsApp API dengan dukungan multi-user, dimana setiap user dapat memiliki beberapa nomor WhatsApp. Dibangun menggunakan Evolution API, Node.js, PostgreSQL, Redis, dan Nginx.

## 🎯 Fitur Utama

### Multi-Tenancy
- ✅ 1 User → Multiple WhatsApp Numbers
- ✅ Setiap User → 1 API Key (untuk autentikasi)
- ✅ Setiap Nomor → 1 Token unik (untuk kirim pesan)

### Manajemen User
- User registration & login
- Plan-based limits (Starter, Business, Enterprise)
- Dashboard dengan statistik real-time

### WhatsApp Management
- Create multiple WhatsApp instances
- QR Code scanning
- Auto-reconnect support
- Status monitoring

### Messaging
- Send text messages
- Send media (image, video, audio, document)
- Webhook support untuk receive messages
- Message statistics & tracking

### Infrastructure
- Load balancing (2+ Evolution API instances)
- Rate limiting & security
- PostgreSQL database dengan indexing optimal
- Redis caching
- Nginx reverse proxy

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (untuk development)
- Minimum 2GB RAM
- Minimum 10GB disk space

## 🚀 Quick Start

### 1. Clone/Extract Project

```bash
# Extract ZIP file atau clone repository
cd whatsapp-saas-complete
```

### 2. Configure Environment

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env file dengan kredensial Anda
nano .env
```

**Wajib diubah di .env:**
```env
DB_PASSWORD=YourSecurePasswordHere2024!
EVOLUTION_API_KEY=your-global-evolution-api-key-here-2024
JWT_SECRET=your-jwt-secret-key-here-2024-super-secure
SERVER_URL=http://your-domain.com  # atau http://localhost untuk testing
```

### 3. Start Services

```bash
# Start semua services
docker-compose up -d

# Monitor logs
docker-compose logs -f
```

### 4. Verify Installation

```bash
# Check health
curl http://localhost/health

# Check services status
docker-compose ps
```

## 📊 Architecture

```
User Request
    ↓
Nginx (Load Balancer) :80
    ↓
SaaS API :3000
    ├→ PostgreSQL :5432 (Data Storage)
    ├→ Redis :6379 (Cache & Queue)
    └→ Evolution API 1/2 :8081/8082 (WhatsApp)
        └→ WhatsApp Connection
```

### Ports

| Service | Port | Description |
|---------|------|-------------|
| Nginx | 80 | Main entry point |
| SaaS API | 3000 | Internal API |
| PostgreSQL | 5432 | Database |
| Evolution API 1 | 8081 | WhatsApp instance 1 |
| Evolution API 2 | 8082 | WhatsApp instance 2 |

## 🔑 API Documentation

### Base URL
```
http://localhost/api
```

### Authentication
All endpoints (except register/login) require API Key:
```
Header: x-api-key: your-api-key-here
```

### Endpoints

#### 1. Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "company_name": "Acme Corp",
  "plan_type": "business"  # starter, business, enterprise
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "api_key": "a1b2c3d4e5f6...",
    "plan_type": "business",
    "max_phone_numbers": 10
  }
}
```

#### 2. Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### 3. Get Profile
```bash
GET /api/user/profile
x-api-key: your-api-key
```

#### 4. Create Phone Number
```bash
POST /api/phone-numbers/create
x-api-key: your-api-key
Content-Type: application/json

{
  "display_name": "Customer Service",
  "webhook_url": "https://yourapp.com/webhook"  # optional
}
```

**Response:**
```json
{
  "success": true,
  "phone_number": {
    "id": 1,
    "instance_name": "user_1_1704067200000_a1b2c3d4",
    "token": "xyz789abc...",
    "display_name": "Customer Service",
    "status": "qr_ready",
    "qr_code": "data:image/png;base64,...",
    "qr_expires_at": "2024-01-01T10:05:00Z"
  }
}
```

#### 5. Get QR Code
```bash
GET /api/phone-numbers/{id}/qr
x-api-key: your-api-key
```

#### 6. List Phone Numbers
```bash
GET /api/phone-numbers
x-api-key: your-api-key
```

#### 7. Get Phone Status
```bash
GET /api/phone-numbers/{id}/status
x-api-key: your-api-key
```

#### 8. Delete Phone Number
```bash
DELETE /api/phone-numbers/{id}
x-api-key: your-api-key
```

#### 9. Send Text Message
```bash
POST /api/messages/send-text
x-api-key: your-api-key
Content-Type: application/json

{
  "token": "xyz789abc...",  # Token dari phone number
  "number": "628123456789",
  "text": "Hello from WhatsApp API!"
}
```

#### 10. Send Media Message
```bash
POST /api/messages/send-media
x-api-key: your-api-key
Content-Type: application/json

{
  "token": "xyz789abc...",
  "number": "628123456789",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Check this out!",
  "mediaType": "image"  # image, video, audio, document
}
```

#### 11. Get Statistics
```bash
GET /api/statistics?start_date=2024-01-01&end_date=2024-01-31
x-api-key: your-api-key
```

#### 12. Get Dashboard
```bash
GET /api/dashboard
x-api-key: your-api-key
```

## 🔄 Typical Usage Flow

1. **Register** → Dapatkan API Key
2. **Create Phone Number** → Dapatkan Token + QR Code
3. **Scan QR Code** dengan WhatsApp → Status menjadi "connected"
4. **Send Messages** menggunakan Token

## 🗄️ Database Schema

### Tables

#### users
- id, email, password_hash, api_key
- plan_type, max_phone_numbers
- status, created_at, updated_at

#### phone_numbers
- id, user_id, instance_name, token
- phone_number, display_name, status
- server_instance, qr_code
- webhook_url, created_at

#### message_stats
- phone_number_id, date
- messages_sent, messages_received
- media_sent, media_received

#### webhook_logs
- phone_number_id, event_type
- payload, status_code
- sent_at, response_time_ms

#### api_requests
- user_id, endpoint, method
- ip_address, created_at

### Views

#### user_dashboard
Aggregated user statistics

#### phone_number_details
Phone numbers with today's stats

## 🛠️ Development

### Local Development

```bash
cd saas-backend

# Install dependencies
npm install

# Set environment variables
export DB_HOST=localhost
export DB_PASSWORD=postgres
export EVOLUTION_API_KEY=your-key
export JWT_SECRET=secret

# Run
npm run dev
```

### Testing API

```bash
# Make test-api.sh executable
chmod +x test-api.sh

# Run tests
./test-api.sh
```

## 📦 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart specific service
docker-compose restart saas-api

# View logs
docker-compose logs -f saas-api

# Rebuild service
docker-compose up -d --build saas-api

# Check service status
docker-compose ps

# Access database
docker-compose exec postgres psql -U postgres -d evolution

# Access redis
docker-compose exec redis redis-cli
```

## 🔍 Monitoring & Troubleshooting

### Check Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f saas-api
docker-compose logs -f evolution-api-1
docker-compose logs -f postgres
```

### Common Issues

#### 1. Database Connection Failed
```bash
# Check postgres is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

#### 2. Evolution API Not Responding
```bash
# Check evolution instances
docker-compose ps evolution-api-1 evolution-api-2

# Check logs
docker-compose logs evolution-api-1

# Restart instances
docker-compose restart evolution-api-1 evolution-api-2
```

#### 3. QR Code Not Generated
- Check Evolution API logs
- Verify EVOLUTION_API_KEY is correct
- Ensure phone number status is 'qr_ready'

### Database Queries

```sql
-- Check users
SELECT * FROM users;

-- Check phone numbers
SELECT * FROM phone_numbers;

-- Check today's message stats
SELECT * FROM phone_number_details;

-- Check webhook logs
SELECT * FROM webhook_logs ORDER BY sent_at DESC LIMIT 10;
```

## 📈 Scaling

### Horizontal Scaling

Tambah Evolution API instances di `docker-compose.yml`:

```yaml
evolution-api-3:
  container_name: evolution-api-3
  image: atendai/evolution-api:latest
  # ... copy configuration dari evolution-api-2
  ports:
    - "8083:8080"
```

Update `saas-backend/src/config/evolution.js`:

```javascript
const EVOLUTION_SERVERS = [
    'http://evolution-api-1:8080',
    'http://evolution-api-2:8080',
    'http://evolution-api-3:8080'  // tambahkan
];
```

### Resource Allocation

Untuk production, sesuaikan resource limits:

```yaml
services:
  saas-api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 🔒 Security

### Production Checklist

- [ ] Ubah semua default passwords di `.env`
- [ ] Generate strong random API keys
- [ ] Enable HTTPS dengan SSL certificate
- [ ] Configure firewall rules
- [ ] Enable PostgreSQL authentication
- [ ] Add Redis password
- [ ] Implement rate limiting
- [ ] Regular backups
- [ ] Monitor logs untuk suspicious activity

### SSL/HTTPS Setup

1. Dapatkan SSL certificate (Let's Encrypt recommended)
2. Place certificate files di `nginx/ssl/`
3. Uncomment HTTPS server block di `nginx/nginx.conf`
4. Update `SERVER_URL` di `.env`

## 💾 Backup & Restore

### Backup Database

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres evolution > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres evolution < backup.sql
```

### Backup Volumes

```bash
# Stop containers
docker-compose down

# Backup volumes
docker run --rm -v whatsapp-saas-complete_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v whatsapp-saas-complete_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## 📝 Plan Limits

| Plan | Max Phone Numbers | Max Messages/Day | Price |
|------|-------------------|------------------|-------|
| Starter | 3 | 1,000 | Free |
| Business | 10 | 5,000 | Paid |
| Enterprise | 50 | 50,000 | Paid |

## 🤝 Support

Untuk bantuan atau pertanyaan:
- Check logs: `docker-compose logs -f`
- Check database: `docker-compose exec postgres psql -U postgres -d evolution`
- Review README dan dokumentasi

## 📄 License

MIT License

## 🎉 Credits

- Evolution API: https://github.com/EvolutionAPI/evolution-api
- Built with Node.js, Express, PostgreSQL, Redis, Docker
