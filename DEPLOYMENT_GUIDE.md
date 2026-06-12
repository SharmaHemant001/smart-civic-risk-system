# 🚀 CivicGuard Production Deployment Guide

This guide details the procedure for deploying the CivicGuard platform to production environments.

---

## 🐋 Containerized Deployment (Docker Compose)

The recommended method for production deployment is **Docker Compose**, which isolates the backend, frontend, and database into secure networks.

### 1. Create a `docker-compose.yml` file in the project root:
```yaml
version: '3.8'

services:
  database:
    image: mongo:6.0
    container_name: civicguard_db
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - civicguard_net

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: civicguard_backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://database:27017/civicguard
      - NODE_ENV=production
      - JWT_SECRET=your_production_jwt_secret_key_987!
      - JWT_REFRESH_SECRET=your_production_jwt_refresh_secret_key_654!
    depends_on:
      - database
    networks:
      - civicguard_net

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: civicguard_frontend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:5000
    depends_on:
      - backend
    networks:
      - civicguard_net

volumes:
  mongo_data:

networks:
  civicguard_net:
    driver: bridge
```

### 2. Add `Dockerfile` to the `backend/` directory:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

### 3. Add `Dockerfile` to the `frontend/` directory:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

### 4. Build and Run:
```bash
docker-compose up -d --build
```

---

## 🛠️ Bare Metal / Virtual Machine Deployment (PM2 & Nginx)

For standard Linux VMs (Ubuntu 22.04 LTS), use **PM2** for process management and **Nginx** as a reverse proxy.

### 1. Install System Dependencies:
```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 & NPM
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install pm2 -g

# Install Nginx
sudo apt install nginx -y
```

### 2. Deploy the Backend:
Navigate to `/var/www/civicguard/backend`, configure `.env`, and start the app using PM2:
```bash
cd /var/www/civicguard/backend
npm install --production

# Start and register with PM2
pm2 start server.js --name "civicguard-backend" --watch

# Ensure backend restarts on server reboot
pm2 save
pm2 startup
```

### 3. Deploy the Frontend:
Navigate to `/var/www/civicguard/frontend`, install dependencies, run build compile, and start the Next production server:
```bash
cd /var/www/civicguard/frontend
npm install
npm run build

# Start Next server via PM2
pm2 start npm --name "civicguard-frontend" -- start -- -p 3000
pm2 save
```

### 4. Configure Nginx Reverse Proxy:
Create a server block configuration file `/etc/nginx/sites-available/civicguard`:
```nginx
server {
    listen 80;
    server_name civicguard.yourdomain.com;

    # Gzip compression configuration
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # Frontend Route Handler
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API Handler
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads Static Assets Handler
    location /uploads {
        alias /var/www/civicguard/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```
Enable the site block and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/civicguard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Let's Encrypt SSL Setup (Certbot)

To secure user logins and data uploads in transit:
```bash
# Install Certbot and the Nginx plugin
sudo apt install certbot python3-certbot-nginx -y

# Obtain and automatically configure SSL certificates
sudo certbot --nginx -d civicguard.yourdomain.com

# Verify renewal cron timer
sudo systemctl status certbot.timer
```

---

## 📁 Database Backups & Maintenance

To perform live database dumps in production without taking the platform offline:
```bash
# Perform database dump
mongodump --uri="mongodb://localhost:27017/civicguard" --out=/var/backups/mongodb/$(date +%F)

# Schedule nightly backups via cron job:
# 0 2 * * * mongodump --uri="mongodb://localhost:27017/civicguard" --out=/var/backups/mongodb/\$(date +\%F)
```
