# 📖 CivicGuard API Documentation

This document describes all API endpoints exposed by the CivicGuard backend server. All endpoint requests and responses are encoded in JSON.

---

## 🔒 Authentication & Authorization Roles

The platform defines five authorization roles in hierarchical order of capability:
1.  `Citizen`: General public user who can submit reports and vote.
2.  `FieldCrew`: Municipal workers assigned to resolve issues.
3.  `Dispatcher`: Central operators who can assign tasks and soft-delete issues.
4.  `Manager`: Directs operations, simulates risk simulations, and views forecasts.
5.  `Admin`: Complete platform management including deleting users and raw telemetry access.

---

## 🚀 API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **Authentication** | | | |
| `/api/auth/register` | `POST` | None | Register a new user account |
| `/api/auth/login` | `POST` | None | Authenticate a user and set refresh cookie |
| `/api/auth/refresh` | `POST` | None | Rotate access and refresh tokens |
| `/api/auth/logout` | `POST` | None | Logout and clear refresh cookie |
| `/api/auth/me` | `GET` | Yes (Any role) | Get current authenticated user details |
| `/api/auth/users/:id` | `DELETE` | Yes (Admin) | Soft-delete a user account |
| **Civic Issues** | | | |
| `/api/issues/upload` | `POST` | None | Submit a new issue (with image upload) |
| `/api/issues` | `GET` | None | Retrieve list of issues |
| `/api/issues/:id/upvote` | `POST` | None | Increment vote count on an issue |
| `/api/issues/:id/vote` | `POST` | None | Vote or verify an issue (duplicate rules check) |
| `/api/issues/:id/validate`| `POST` | None | Validate/verify status (community verification) |
| `/api/issues/:id/status` | `PATCH` | None | Update the status of an issue |
| `/api/issues/:id` | `DELETE`| Yes (Dispatcher/Admin)| Soft-delete an issue |
| `/api/issues/stats` | `GET` | None | Fetch top-level stats |
| `/api/issues/top-areas` | `GET` | None | Fetch risk rank standings of areas |
| `/api/issues/homepage-stats`| `GET` | None | Fetch key dashboard telemetry stats |
| **Authority Command** | | | |
| `/api/authority/stats` | `GET` | Yes (Manager/Admin)| Detailed operational queue statistics |
| `/api/authority/issues` | `GET` | Yes (Dispatcher/Manager/Admin)| Retrieve active issues for queue management |
| `/api/authority/areas` | `GET` | Yes (Manager/Admin)| Retrieve granular neighborhood CRI ratings |
| `/api/authority/analytics`| `GET` | Yes (Manager/Admin)| Risk category distribution analysis |
| `/api/authority/bulk-update`| `POST` | Yes (Dispatcher/Manager/Admin)| Bulk-resolve or modify multiple issues |
| `/api/authority/export` | `GET` | Yes (Manager/Admin)| Export active issues queue to CSV |
| `/api/authority/impact-simulation`| `GET`| Yes (Manager/Admin)| Previews CRI reduction from issue resolutions |
| **Forecasting & Projections** | | | |
| `/api/authority/forecast/city`| `GET`| Yes (Manager/Admin)| 7, 14, 30-day cumulative city-wide forecasts |
| `/api/authority/forecast/areas`| `GET`| Yes (Manager/Admin)| Area-by-area risk forecasts and standings |
| `/api/authority/forecast/alerts`| `GET`| Yes (Manager/Admin)| Emerging alerts (CRI growth > 15 points in 7 days) |
| `/api/authority/forecast/intervention`| `POST`| Yes (Manager/Admin)| Simulates future CRI reduction with custom IDs |
| `/api/authority/forecast/heatmap`| `GET`| Yes (Manager/Admin)| Time offset heatmap data |
| **Route Risk Intelligence** | | | |
| `/api/routes/risk-analysis` | `POST` | None | Corridor-risk route options (Primary vs Alternative)|
| **Live Escalation Alerts** | | | |
| `/api/escalations/recent` | `GET` | None | Retrieve recent escalation events (spikes) |
| `/api/escalations/check` | `POST` | None | Trigger manual check for new escalation events |
| **AI Classification** | | | |
| `/api/ai/classify` | `POST` | None | Run LLM text-to-category classification |

---

## 🛠️ Detailed Endpoint Schemas

### 1. Authentication Endpoints

#### `POST /api/auth/register`
Creates a user account. Password requires $\ge 8$ characters, at least one uppercase letter, one lowercase letter, one number, and one special character.
*   **Request Body**:
    ```json
    {
      "name": "Hemant Sharma",
      "email": "sharma@example.com",
      "password": "StrongPassword123!",
      "role": "Citizen"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "message": "User registered successfully",
      "user": {
        "id": "647b2c0192d1921c54b51a02",
        "name": "Hemant Sharma",
        "email": "sharma@example.com",
        "role": "Citizen"
      }
    }
    ```

#### `POST /api/auth/login`
Authenticates a user. On success, issues a short-lived JSON Web Token (JWT) in the response body, and sets a rotated, cryptographically hashed, secure HTTP-only refresh token as a cookie (`refreshToken`). Locks account for 15 minutes after 5 consecutive failed attempts.
*   **Request Body**:
    ```json
    {
      "email": "sharma@example.com",
      "password": "StrongPassword123!"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "647b2c0192d1921c54b51a02",
        "name": "Hemant Sharma",
        "email": "sharma@example.com",
        "role": "Citizen"
      }
    }
    ```

#### `POST /api/auth/refresh`
Rotates access and refresh tokens. Reads the `refreshToken` from the client's cookie, checks it against the database hash, invalidates it to prevent replay attacks, and returns a new access token while setting a new rotated refresh cookie.
*   **Response (200 OK)**:
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```

#### `POST /api/auth/logout`
Logs out the user. Clears the `refreshToken` cookie and nullifies the user's `refreshTokenHash` in the database.
*   **Response (200 OK)**:
    ```json
    {
      "message": "Logged out successfully"
    }
    ```

---

### 2. Issues Endpoints

#### `POST /api/issues/upload`
Submits a new citizen report. Accepts multipart form data. Files are validated using magic binary signature headers.
*   **Request Body (Multipart Form)**:
    *   `title` (string): Title of issue.
    *   `description` (string): Detailed description.
    *   `issueType` (string): Must be one of `pothole`, `garbage`, `sewer`, `construction`.
    *   `latitude` (number): GPS coordinates latitude.
    *   `longitude` (number): GPS coordinates longitude.
    *   `image` (file): JPEG/PNG/WEBP upload (max 5MB).
*   **Response (201 Created)**:
    ```json
    {
      "_id": "647b2c0192d1921c54b51a55",
      "title": "Severe Pothole on 5th Cross",
      "description": "Large road gap causing vehicle delays.",
      "issueType": "pothole",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "status": "pending",
      "riskScore": "Medium",
      "finalRisk": 55,
      "imageUrl": "/uploads/1685816321921.png"
    }
    ```

#### `GET /api/issues`
Retrieves list of active issues.
*   **Query Parameters**:
    *   `status` (optional string): Filter by `pending`, `in-progress`, `resolved`.
*   **Response (200 OK)**:
    ```json
    [
      {
        "_id": "647b2c0192d1921c54b51a55",
        "issueType": "pothole",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "status": "pending",
        "riskScore": "Medium",
        "finalRisk": 55
      }
    ]
    ```

---

### 3. Route Risk Endpoints

#### `POST /api/routes/risk-analysis`
Integrates with OSRM to generate primary (Route A) and alternative (Route B) path options between start and end. Applies flat-earth segment projection mathematics to identify all active issues within a **50-meter corridor** of each route geometry and recommends the safest route.
*   **Request Body**:
    ```json
    {
      "start": { "lat": 12.9716, "lon": 77.5946 },
      "end": { "lat": 12.9801, "lon": 77.6012 }
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "routes": [
        {
          "routeId": "Route A",
          "distance": 1540,
          "duration": 240,
          "routeRisk": 88,
          "criticalIssues": 1,
          "geometry": { "coordinates": [...] },
          "issuesInCorridor": ["647b2c0192d1921c54b51a55"]
        },
        {
          "routeId": "Route B",
          "distance": 1820,
          "duration": 280,
          "routeRisk": 53,
          "criticalIssues": 0,
          "geometry": { "coordinates": [...] },
          "issuesInCorridor": []
        }
      ],
      "recommendedRoute": "Route B",
      "recommendationReason": "Route B reduces route risk by 40% and avoids cumulative risk score by 35 points."
    }
    ```

---

### 4. Escalations Endpoints

#### `GET /api/escalations/recent`
Returns recent reports spikes grouped within the last hour.
*   **Response (200 OK)**:
    ```json
    [
      {
        "_id": "647b2c0192d1921c54b51c99",
        "clusterId": "Indiranagar",
        "issueCount": 4,
        "oldRisk": 45,
        "newRisk": 90,
        "riskIncrease": 100,
        "status": "Critical",
        "trendDirection": "Increasing",
        "createdAt": "2026-06-07T15:10:00.000Z"
      }
    ]
    ```

#### `POST /api/escalations/check`
Triggers an immediate evaluation of rolling 1-hour report clustering to check for new report spikes.
*   **Response (200 OK)**:
    ```json
    {
      "message": "Escalation check completed successfully",
      "eventsTriggered": 1
    }
    ```

---

### 5. Forecasting Endpoints (Manager/Admin Only)

#### `GET /api/authority/forecast/city`
Provides 7, 14, and 30-day cumulative city-wide risk forecasts.
*   **Query Parameters**:
    *   `weather` (optional string): `clear`, `rainy`, `stormy` (applies dynamic risk multipliers).
*   **Response (200 OK)**:
    ```json
    {
      "cityForecast": {
        "currentCRI": 62,
        "forecasts": {
          "7d": { "totalRisk": 680, "avgCRI": 65 },
          "14d": { "totalRisk": 740, "avgCRI": 69 },
          "30d": { "totalRisk": 890, "avgCRI": 76 }
        }
      },
      "recommendations": [
        {
          "area": "Koramangala",
          "projectedCRI30d": 84,
          "driver": "Spike in garbage pileup, SLA breach risk high",
          "action": "Dispatch Crew"
        }
      ]
    }
    ```

#### `POST /api/authority/forecast/intervention`
Simulates expected future City Risk Index (CRI) reductions when resolving specific selected issues.
*   **Request Body**:
    ```json
    {
      "ids": ["647b2c0192d1921c54b51a55", "647b2c0192d1921c54b51a56"],
      "weather": "clear"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "originalCityRisk30d": 890,
      "projectedCityRisk30d": 712,
      "improvement": 20,
      "cityForecast": { ... }
    }
    ```
