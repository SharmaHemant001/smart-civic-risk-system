# 📊 CivicGuard Testing & Verification Report

This document reports the verification and performance testing results of the CivicGuard platform.

---

## 🎯 Executive Test Summary

*   **Total Test Suites**: 11
*   **Total Test Files Executed**: 11
*   **Tests Status**: **100% PASS** ✅ (0 failures, 0 warnings)
*   **Database Target**: MongoDB (Local instance)
*   **Environment**: Node.js ES Modules, Express REST Endpoints

---

## 🚦 Test Suite Standings

The following table lists the status and coverage of all backend test files located in the `backend/tests/` directory:

| Test File | Covered Functionalities | Assertions Run | Status |
| :--- | :--- | :---: | :---: |
| `riskEngine.test.js` | TimeFactor multiplier, weather multipliers, projections, CRI growth | 8 | **PASS** ✅ |
| `auth.test.js` | Strong password enforcement, unique registration, lockout, token rotation | 25 | **PASS** ✅ |
| `rbac.test.js` | Token validation, role restrictions (`Citizen`, `Dispatcher`, `Admin`) | 12 | **PASS** ✅ |
| `security.test.js` | File extension/mimetype check, 5MB limit, binary magic signatures | 15 | **PASS** ✅ |
| `validation.test.js` | express-validator schema verification for registration and uploads | 18 | **PASS** ✅ |
| `authority.test.js` | Queue sorting, area standing calculations, simulator calculations, CSV export | 10 | **PASS** ✅ |
| `forecast.test.js` | Growth forecasts, priority drivers explainability, heatmap coordinates | 10 | **PASS** ✅ |
| `ai.test.js` | Synonym resolution, classification confidence, LLM endpoints | 12 | **PASS** ✅ |
| `route.test.js` | Perpendicular math projection, 50m corridor risk, routing recommendations | 16 | **PASS** ✅ |
| `escalation.test.js` | Rolling 1h geographical clustering, rate limits, status alerts | 12 | **PASS** ✅ |
| `performance.test.js` | B-Tree and Spatial Index comparison on 10,000 seeded issues | 4 | **PASS** ✅ |

---

## 📝 Detailed Test Cases & Assertions Verified

### 1. `auth.test.js`
*   Rejects weak password (no uppercase/lowercase/digits mix) with HTTP 400.
*   Registers user account successfully with HTTP 201; verifies the role matches `Citizen` and registration is recorded in the `AuditLog` collection with `INFO` severity.
*   Rejects duplicate registrations with HTTP 400.
*   Locks user account for 15 minutes after 5 consecutive failed login attempts; records account lockout in `AuditLog` with `CRITICAL` severity and rejects correct login attempts during the lockout.
*   Allows successful login with HTTP 200; returns an access token in the response body and sets a secure `refreshToken` cookie.
*   Verifies the refresh token is hashed via SHA-256 before being saved in the database.
*   Rotates access and refresh tokens on refresh; invalidates the previous refresh token to prevent replay attacks.
*   Supports user logout with HTTP 200, clearing the browser cookie and nullifying the database hash.

### 2. `rbac.test.js`
*   Blocks request without JWT token (HTTP 401).
*   Blocks request with malformed JWT token (HTTP 401).
*   Gives access to authenticated user (HTTP 200); populates `req.user` payload with database properties.
*   Restricts access to unauthorized roles (HTTP 403).
*   Grants access to authorized roles.

### 3. `security.test.js`
*   Allows files without attachments to pass standard checks.
*   Allows valid images matching JPG, PNG, and WEBP extensions.
*   Rejects files exceeding the 5MB size limit.
*   Rejects files with disallowed extensions (e.g. `.exe`, `.js`).
*   Rejects files with mismatching mimetypes.
*   Rejects files that fail the binary magic signature check (e.g. malware disguised as `fake.jpg`).

### 4. `route.test.js`
*   Validates perpendicular projection math for flat-earth segment coordinates.
*   Calculates distance of point to line segment (returns 0m if point is online/vertex).
*   Correctly queries active database issues within a 50m corridor of OSRM route geometries.
*   Aggregates cumulative risk scores (`finalRisk` sum) and critical issues counts for Route A and Route B.
*   Recommends the safest route (lower risk, fewer critical threats, and shorter duration).
*   Logs search metrics inside the `RouteHistory` collection.

### 5. `escalation.test.js`
*   Aggregates active issues reported within a rolling 1-hour window by location name.
*   Triggers an `EscalationEvent` if $\ge 3$ reports occur in a single location cluster.
*   Applies anti-spam rate limiting: prevents duplicate escalation events for the same cluster within an hour.
*   Maps event severity level to CRI percentage growth: `Critical` ($\ge 25\%$), `Warning` ($10-25\%$), `Info` ($<10\%$).

---

## ⚡ Database Performance Optimization Report

To verify the scalability of our index configurations, we compared database queries against a dataset of 10,000 issues.

### Performance Standings:
*   **Spatial Bounding Box Query**: **FAILED** without index (MongoDB requires a 2dsphere index for location queries), completes in **2.95 ms** with index.
*   **Compound Filter Query**: Index speedup: **1.7x** (Query duration drops from 15.97 ms to 9.54 ms).
*   **Sorted History Query**: Index speedup: **1.1x** (Query duration drops from 14.58 ms to 12.76 ms).
*   **Type Filtered Query**: Index speedup: **1.3x** (Query duration drops from 8.33 ms to 6.24 ms).

---

## 📋 Execution Log output

```text
======================================================
🚦 CIVICGUARD BACKEND UNIFIED TEST SUITE RUNNER
======================================================

▶ Running: riskEngine.test.js...
Connected to MongoDB for Testing.
✅ BaseRisk formulas verified.
✅ Time factor escalation verified.
✅ Projections verified.
✅ Weather multipliers verified.
✅ Projections breakdown verified.
✅ PASSED: riskEngine.test.js

▶ Running: auth.test.js...
Connected to MongoDB for Auth Testing.
✅ PASSED: Should reject weak password with 400
✅ PASSED: Should return password strength error message
✅ PASSED: Should successfully register with 201
✅ PASSED: Registered email should match input
✅ PASSED: User should exist in database
✅ PASSED: User should have Citizen role
✅ PASSED: Registration action should be logged in AuditLog
✅ PASSED: Registration severity should be INFO
✅ PASSED: Duplicate registration should return 400
✅ PASSED: Duplicate email error verified.
✅ PASSED: Brute force account lockouts verified.
✅ PASSED: Rotated tokens verified.
✅ PASSED: Logout clears database hashes.
✅ PASSED: auth.test.js

▶ Running: rbac.test.js...
Connected to MongoDB for RBAC Testing.
✅ PASSED: protect middleware - No Token -> 401
✅ PASSED: protect middleware - Invalid Token -> 401
...
✅ ALL TESTS PASSED SUCCESSFULLY!
```
*(Full logs stored under `<appDataDir>\brain\<conversation-id>\.system_generated\tasks\task-1694.log`)*
