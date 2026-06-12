# ⚙️ CivicGuard Environment Configuration Guide

This guide describes all environment variables used by the CivicGuard backend and frontend applications.

---

## 📂 Backend Environment Variables

Create a `.env` file in the `backend/` directory to configure the server during startup.

| Variable | Required? | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `5000` | The port the Express application server listens on. |
| `MONGO_URI` | **Required** | `mongodb://localhost:27017/civicguard` | The MongoDB connection string (local instance or MongoDB Atlas). |
| `NODE_ENV` | Optional | `development` | The runtime environment flag. Set to `production` in production builds. |
| `JWT_SECRET` | **Required** | None | Cryptographic key used to sign access tokens (15-min expiry). Use a strong random key. |
| `JWT_REFRESH_SECRET`| **Required** | None | Cryptographic key used to sign refresh tokens (7-day expiry). Use a strong random key. |

---

## 📂 Frontend Environment Variables

Next.js variables prefixing `NEXT_PUBLIC_` are bundled into the client-side code and exposed to the browser. Configure these in the `frontend/` directory (e.g. in `.env.local` or via host provider dashboards).

| Variable | Required? | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL`| **Required** | `http://localhost:5000` | Fully qualified URL pointing to the CivicGuard backend API gateway. |

---

## 📝 Example Configuration Templates

### 1. Local Development (`backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/civicguard
NODE_ENV=development
JWT_SECRET=dev_jwt_access_secret_key_12345!
JWT_REFRESH_SECRET=dev_jwt_refresh_secret_key_67890!
```

### 2. Local Testing (`backend/.env.test`)
Automated tests automatically load the connection configurations:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/civicguard
NODE_ENV=development
JWT_SECRET=test_jwt_access_secret_key_12345!
JWT_REFRESH_SECRET=test_jwt_refresh_secret_key_67890!
```

### 3. Production VM Deployment (`/var/www/civicguard/backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://admin:SuperSecurePasswordHash987@db.yourdomain.com:27017/civicguard?authSource=admin
NODE_ENV=production
JWT_SECRET=f7e345b206c6a8f102cda983b6215162a8c3d9a10294b1bcde91234f9a3e2009
JWT_REFRESH_SECRET=e81d227acbc3e9b1bc1023a1023f46a29bc3d0d8291410abcf0a92cdffbc0209
```

---

## 🔒 Security Best Practices for Production Secrets
1.  **Never commit `.env` files**: Ensure that `backend/.env` and `frontend/.env.local` are added to the respective `.gitignore` files.
2.  **Generate High Entropy Keys**: In production, generate secrets using cryptographically secure random number generators:
    ```bash
    # Generate a secure 64-character hex secret
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
3.  **Use Key Management Systems**: When deploying to containerized services (e.g. AWS ECS, GCP Cloud Run), pass environment variables using secret managers (AWS Secrets Manager or HashiCorp Vault) rather than writing them to plain-text Docker files.
