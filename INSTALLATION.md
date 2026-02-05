# Installation Guide - WhatsApp SaaS API

Panduan lengkap instalasi step-by-step untuk WhatsApp SaaS API Platform.

## 📋 Requirements

### Minimum System Requirements
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 10GB minimum, 20GB recommended
- **CPU**: 2 cores minimum, 4 cores recommended

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (optional, untuk development)

## 🚀 Step-by-Step Installation

### Step 1: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
```

### Step 2: Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### Step 3: Setup Project

```bash
# Extract ZIP atau clone repository
cd /opt
sudo mkdir wa-saas
sudo chown $USER:$USER wa-saas
cd wa-saas

# Extract project files
unzip whatsapp-saas-complete.zip
cd whatsapp-saas-complete

# Atau jika clone dari git
# git clone <repository-url>
# cd whatsapp-saas-complete
```

### Step 4: Configure Environment

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env file
nano .env
```

**Ubah nilai berikut di file .env:**

```env
# Database Password - CHANGE THIS!
DB_PASSWORD=YourVeryStrongPasswordHere2024!

# Evolution API Key - CHANGE THIS!
EVOLUTION_API_KEY=$(openssl rand -hex 32)

# JWT Secret - CHANGE THIS!
JWT_SECRET=$(openssl rand -hex 32)

# Server URL (ganti dengan domain Anda)
SERVER_URL=http://your-domain.com
```

**Generate secure random keys:**

```bash
# Generate DB Password
echo "DB_PASSWORD=$(openssl rand -base64 32)"

# Generate Evolution API Key
echo "EVOLUTION_API_KEY=$(openssl rand -hex 32)"

# Generate JWT Secret
echo "JWT_SECRET=$(openssl rand -hex 32)"
```

### Step 5: Start Services

```bash
# Make sure you're in project directory
cd /opt/wa-saas/whatsapp-saas-complete

# Start all services
docker-compose up -d

# This will:
# 1. Pull all required images
# 2. Create volumes
# 3. Initialize database
# 4. Start all containers
```

### Step 6: Verify Installation

```bash
# Check all containers are running
docker-compose ps

# Expected output:
# NAME                STATUS         PORTS
# postgres           Up             0.0.0.0:5432->5432/tcp
# redis              Up             
# evolution-api-1    Up (healthy)   0.0.0.0:8081->8080/tcp
# evolution-api-2    Up (healthy)   0.0.0.0:8082->8080/tcp
# saas-api           Up (healthy)   0.0.0.0:3000->3000/tcp
# nginx-lb           Up (healthy)   0.0.0.0:80->80/tcp, 443/tcp
```

### Step 7: Check Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f saas-api
docker-compose logs -f evolution-api-1

# Check for errors
docker-compose logs | grep -i error
```

### Step 8: Test Installation

```bash
# Test health endpoint
curl http://localhost/health

# Expected response:
# healthy

# Test SaaS API
curl http://localhost:3000/health

# Test Evolution API
curl http://localhost:8081
```

### Step 9: Run Test Script

```bash
# Make script executable
chmod +x test-api.sh

# Run tests
./test-api.sh

# Script will:
# 1. Register a test user
# 2. Create a phone number
# 3. Get QR code
# 4. Test all endpoints
```

### Step 10: Access Database (Optional)

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d evolution

# Run queries
evolution=# SELECT * FROM users;
evolution=# SELECT * FROM phone_numbers;
evolution=# \q
```

## 🔧 Configuration

### Port Configuration

Default ports yang digunakan:

| Service | Port | Description |
|---------|------|-------------|
| Nginx | 80 | HTTP access |
| Nginx | 443 | HTTPS access (jika enabled) |
| SaaS API | 3000 | Internal API |
| PostgreSQL | 5432 | Database |
| Evolution API 1 | 8081 | WhatsApp instance 1 |
| Evolution API 2 | 8082 | WhatsApp instance 2 |

Untuk mengubah port, edit `docker-compose.yml`:

```yaml
services:
  nginx:
    ports:
      - "8080:80"  # Change 80 to 8080
```

### Database Configuration

Edit database credentials di `.env`:

```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=evolution
DB_USER=postgres
DB_PASSWORD=your-password
```

### Evolution API Configuration

Konfigurasi Evolution API tersimpan di environment variables di `docker-compose.yml`.

Untuk custom configuration, edit section:

```yaml
evolution-api-1:
  environment:
    LOG_LEVEL: ERROR,WARN,INFO,DEBUG  # Adjust log level
    QRCODE_LIMIT: 30  # QR code attempts
```

## 🔒 Security Setup

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# Block direct access to internal services
sudo ufw deny 3000/tcp
sudo ufw deny 5432/tcp
sudo ufw deny 8081/tcp
sudo ufw deny 8082/tcp
```

### 2. SSL/HTTPS Setup (Production)

```bash
# Install Certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# Set permissions
sudo chown $USER:$USER nginx/ssl/*.pem
```

Edit `nginx/nginx.conf` dan uncomment HTTPS server block:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of configuration
}
```

Restart Nginx:

```bash
docker-compose restart nginx
```

### 3. Database Security

```bash
# Change default postgres password
docker-compose exec postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'new-secure-password';"

# Update .env with new password
nano .env
# Change DB_PASSWORD=new-secure-password

# Restart services
docker-compose restart
```

## 📦 Production Deployment

### 1. Set Production Environment

```bash
# Edit .env
nano .env
```

Add/Update:

```env
NODE_ENV=production
SERVER_URL=https://your-domain.com
```

### 2. Resource Limits

Edit `docker-compose.yml` untuk production limits:

```yaml
services:
  saas-api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### 3. Enable Auto-start

```bash
# Create systemd service
sudo nano /etc/systemd/system/whatsapp-saas.service
```

Content:

```ini
[Unit]
Description=WhatsApp SaaS API
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/wa-saas/whatsapp-saas-complete
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable service:

```bash
sudo systemctl enable whatsapp-saas
sudo systemctl start whatsapp-saas
```

## 🔄 Backup & Restore

### Backup Script

Create `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/whatsapp-saas"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U postgres evolution > $BACKUP_DIR/db_$DATE.sql

# Backup volumes
docker run --rm \
  -v whatsapp-saas-complete_postgres_data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/volumes_$DATE.tar.gz -C /data .

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable and add to crontab:

```bash
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/wa-saas/whatsapp-saas-complete/backup.sh
```

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs <service-name>

# Common issues:
# 1. Port already in use
sudo lsof -i :80
sudo lsof -i :3000

# 2. Permission issues
sudo chown -R $USER:$USER .

# 3. Corrupted volumes
docker-compose down -v
docker-compose up -d
```

### Database connection failed

```bash
# Check postgres is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres

# Check connection
docker-compose exec postgres psql -U postgres -d evolution -c "\l"
```

### Evolution API not responding

```bash
# Check logs
docker-compose logs evolution-api-1

# Restart
docker-compose restart evolution-api-1 evolution-api-2

# Check EVOLUTION_API_KEY is correct
grep EVOLUTION_API_KEY .env
```

### Out of memory

```bash
# Check memory usage
docker stats

# Increase swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📊 Monitoring

### Check Service Status

```bash
# All services
docker-compose ps

# Health checks
curl http://localhost/health
curl http://localhost:3000/health
curl http://localhost:8081
```

### View Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f saas-api
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## 🎯 Next Steps

After successful installation:

1. ✅ Test API dengan `./test-api.sh`
2. ✅ Setup SSL certificate untuk production
3. ✅ Configure firewall rules
4. ✅ Setup automated backups
5. ✅ Monitor logs dan resource usage
6. ✅ Review security checklist
7. ✅ Start creating WhatsApp instances!

## 📞 Support

Jika mengalami masalah:

1. Check logs: `docker-compose logs -f`
2. Check documentation: `README.md`
3. Verify configuration: `.env` file
4. Test endpoints: `./test-api.sh`

---

**Installation complete! 🎉**

Your WhatsApp SaaS API is now running at:
- Main API: http://localhost/api
- Health Check: http://localhost/health
