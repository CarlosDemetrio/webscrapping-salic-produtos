# Production Deployment Guide

Complete guide for deploying SALIC Web Scraping API to production on Oracle Cloud Infrastructure (OCI).

## Prerequisites

- OCI Account (Always Free tier eligible)
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)
- SSH key pair

## Infrastructure Setup

### 1. Compute Instance (ARM Ampere A1)

**Specifications:**
- Shape: VM.Standard.A1.Flex
- OCPUs: 4
- Memory: 24 GB
- Storage: 100 GB
- OS: Oracle Linux 8 (ARM64)

**Create Instance:**

```bash
# Via OCI Console
1. Compute > Instances > Create Instance
2. Select "VM.Standard.A1.Flex"
3. Choose Oracle Linux 8
4. Upload SSH public key
5. Configure VCN and subnet
6. Create
```

### 2. Autonomous Database (PostgreSQL)

**Specifications:**
- Type: Transaction Processing
- Version: PostgreSQL 14 compatible
- OCPU: 1 (Always Free)
- Storage: 20 GB
- Auto-scaling: Disabled

**Create Database:**

```bash
# Via OCI Console
1. Autonomous Database > Create
2. Choose "Transaction Processing"
3. Select "Always Free"
4. Set admin password
5. Create
6. Download wallet
```

### 3. Virtual Cloud Network (VCN)

**Security List Rules:**

```bash
# Ingress Rules
0.0.0.0/0 TCP 22   # SSH
0.0.0.0/0 TCP 80   # HTTP
0.0.0.0/0/0 TCP 443  # HTTPS

# Egress Rules
0.0.0.0/0 All Traffic # Allow outbound
```

## Server Setup

### 1. Initial Server Configuration

```bash
# Connect via SSH
ssh opc@<instance-ip>

# Update system
sudo dnf update -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Install Git
sudo dnf install -y git

# Install Docker
sudo dnf install -y docker-engine
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install PM2 globally
sudo npm install -g pm2

# Reboot for group changes
sudo reboot
```

### 2. Application Deployment

```bash
# Create app directory
sudo mkdir -p /opt/salic-api
sudo chown $USER:$USER /opt/salic-api
cd /opt/salic-api

# Clone repository
git clone <your-repo-url> .

# Install dependencies
npm ci --production

# Build application
npm run build
```

### 3. Environment Configuration

```bash
# Create production .env
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000

# Database (use Autonomous DB connection string)
DATABASE_URL="postgresql://admin:password@host:port/dbname?ssl=true&sslmode=require"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Worker
WORKER_CONCURRENCY=4

# Scraper
MAX_WORKERS=4

# Security
SCRAPER_SECRET_KEY=<generate-strong-random-key>
EOF

# Secure permissions
chmod 600 .env
```

### 4. Database Migration

```bash
# Run Prisma migrations
npm run prisma:deploy

# Verify connection
npm run prisma:studio
```

### 5. Redis Setup

```bash
# Create docker-compose for Redis
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: salic-redis
    restart: always
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru

volumes:
  redis-data:
EOF

# Start Redis
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker ps
```

## PM2 Process Management

### 1. PM2 Ecosystem Configuration

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'salic-api',
      script: './dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false
    },
    {
      name: 'salic-worker',
      script: './dist/worker.js',
      instances: 4,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '800M',
      autorestart: true,
      watch: false
    },
    {
      name: 'salic-maestro',
      script: './dist/maestro/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/maestro-error.log',
      out_file: './logs/maestro-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '200M',
      autorestart: true,
      watch: false,
      cron_restart: '0 2 * * *'
    }
  ]
};
EOF
```

### 2. Start Services

```bash
# Create logs directory
mkdir -p logs

# Start all services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions printed

# Monitor
pm2 monit

# View logs
pm2 logs

# Check status
pm2 status
```

## Nginx Reverse Proxy

### 1. Install Nginx

```bash
sudo dnf install -y nginx
sudo systemctl enable nginx
```

### 2. Configure Nginx

```bash
sudo cat > /etc/nginx/conf.d/salic-api.conf << 'EOF'
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=search_limit:10m rate=30r/m;

# Upstream
upstream salic_api {
    least_conn;
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/salic-api-access.log;
    error_log /var/log/nginx/salic-api-error.log;

    # Max body size
    client_max_body_size 10M;

    # API endpoints
    location / {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://salic_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Search endpoint with stricter rate limit
    location /api/search {
        limit_req zone=search_limit burst=10 nodelay;
        proxy_pass http://salic_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check (no rate limit)
    location /health {
        proxy_pass http://salic_api;
        access_log off;
    }
}
EOF
```

### 3. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal (already configured by certbot)
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer
```

### 4. Start Nginx

```bash
# Test configuration
sudo nginx -t

# Start service
sudo systemctl start nginx

# Verify
curl https://api.yourdomain.com/health
```

## Firewall Configuration

```bash
# Configure firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

## Monitoring Setup

### 1. PM2 Plus (Optional)

```bash
# Link to PM2 Plus
pm2 link <secret> <public>

# Monitor at https://app.pm2.io
```

### 2. Log Rotation

```bash
sudo cat > /etc/logrotate.d/salic-api << 'EOF'
/opt/salic-api/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 3. Disk Space Monitoring

```bash
# Create monitoring script
cat > /opt/salic-api/scripts/check-disk.sh << 'EOF'
#!/bin/bash
THRESHOLD=80
USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $USAGE -gt $THRESHOLD ]; then
    echo "Disk usage is ${USAGE}% - threshold exceeded!"
    # Send alert (configure your notification method)
fi
EOF

chmod +x /opt/salic-api/scripts/check-disk.sh

# Add to crontab
crontab -e
# Add: 0 * * * * /opt/salic-api/scripts/check-disk.sh
```

## Backup Strategy

### 1. Database Backup

```bash
# Create backup script
cat > /opt/salic-api/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/salic-api/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="salic_db_${DATE}.dump"

mkdir -p $BACKUP_DIR

# Backup using Prisma
cd /opt/salic-api
npm run prisma:db:export -- --file=$BACKUP_DIR/$FILENAME

# Keep only last 30 days
find $BACKUP_DIR -name "*.dump" -mtime +30 -delete

echo "Backup completed: $FILENAME"
EOF

chmod +x /opt/salic-api/scripts/backup-db.sh

# Schedule daily backup
crontab -e
# Add: 0 3 * * * /opt/salic-api/scripts/backup-db.sh
```

### 2. Application Backup

```bash
# Backup code and configuration
tar -czf salic-api-backup-$(date +%Y%m%d).tar.gz \
  /opt/salic-api \
  --exclude=/opt/salic-api/node_modules \
  --exclude=/opt/salic-api/dist \
  --exclude=/opt/salic-api/logs
```

## Deployment Checklist

- [ ] Compute instance created and configured
- [ ] Autonomous Database provisioned
- [ ] Redis running in Docker
- [ ] Application built and deployed
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] PM2 processes started
- [ ] PM2 startup configured
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained
- [ ] Firewall rules configured
- [ ] Log rotation configured
- [ ] Backup scripts configured
- [ ] Monitoring setup complete
- [ ] Health check passing
- [ ] API accessible via HTTPS
- [ ] Documentation updated

## Maintenance Tasks

### Daily
- Check PM2 status: `pm2 status`
- Review error logs: `pm2 logs --err`
- Monitor disk usage: `df -h`

### Weekly
- Check database size: `npm run prisma:studio`
- Review slow queries
- Clean old jobs: `curl -X POST http://localhost:3000/api/queue/clean`

### Monthly
- Update dependencies: `npm update`
- Security audit: `npm audit`
- Review and optimize indexes
- Backup retention cleanup

## Troubleshooting

### API Not Responding

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs salic-api --lines 100

# Restart API
pm2 restart salic-api

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

### High Memory Usage

```bash
# Check process memory
pm2 monit

# Restart workers
pm2 restart salic-worker

# Check for memory leaks
pm2 logs salic-worker | grep "memory"
```

### Database Connection Issues

```bash
# Test connection
npm run prisma:studio

# Check connection pool
SELECT * FROM pg_stat_activity;

# Restart application
pm2 restart all
```

### Queue Stalled

```bash
# Check Redis
docker exec -it salic-redis redis-cli ping

# Check queue status
curl http://localhost:3000/api/queue/status

# Restart workers
pm2 restart salic-worker
```

## Scaling Recommendations

### Vertical Scaling
- Increase OCPU: 4 → 8
- Increase Memory: 24GB → 48GB
- Increase worker concurrency

### Horizontal Scaling
- Add load balancer
- Deploy multiple compute instances
- Use Redis cluster
- Database read replicas

## Security Hardening

```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Setup fail2ban
sudo dnf install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Automatic security updates
sudo dnf install -y dnf-automatic
sudo systemctl enable dnf-automatic.timer
sudo systemctl start dnf-automatic.timer
```

## Cost Optimization

**Always Free Resources Used:**
- Compute: VM.Standard.A1.Flex (4 OCPU, 24GB) = $0
- Database: Autonomous Database (1 OCPU, 20GB) = $0
- Storage: Block Volume (100GB) = $0
- Network: 10TB egress/month = $0

**Total Monthly Cost: $0**

## Support

For deployment issues:
- Check logs: `pm2 logs`
- Review documentation
- Open GitHub issue
- Contact support team
