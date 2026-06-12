# CivicGuard

### Municipal Risk Intelligence Platform

Transforming citizen-reported hazards into actionable operational intelligence.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Test Coverage](https://img.shields.io/badge/tests-11%20%2F%2011%20passed-brightgreen.svg)](#)
[![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Node.js%20%7C%20MongoDB-blue.svg)](#)
[![Uptime](https://img.shields.io/badge/uptime-99.8%25-emerald.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Overview

CivicGuard is a Municipal Risk Intelligence and Decision Support Platform designed to help local government authorities identify, prioritize, and mitigate infrastructure hazards. 

Rather than serving as a traditional complaint portal, CivicGuard processes unstructured reports to compute live spatial risk values, track SLA breach velocities, and recommend optimal dispatches. The platform provides decision-makers with quantitative answers to critical operational questions:
* Which hazards present the highest immediate safety threat to the public?
* Which neighborhoods are showing signs of systemic degradation?
* Which active tickets are at risk of breaching their SLA resolution window?
* Which combination of maintenance dispatches yields the greatest reduction in citywide risk?

---

## Problem Statement

Traditional municipal systems treat all citizen reports with equal priority, resulting in operational bottlenecks:
* **No Risk Analysis**: Reports are sorted by submission timestamp, meaning a minor garbage spill can block a critical open manhole in the dispatch queue.
* **Lack of Geospatial Context**: Complaints are treated as isolated database rows, hiding high-density hazard zones and systemic hotspot growth.
* **Reactive Dispatching**: Crews are deployed based on call volume rather than risk-reduction potential, reducing municipal efficiency.
* **Backlog Blindness**: Supervisors cannot forecast backlog accumulation or model the impact of changing weather scenarios.

CivicGuard resolves these gaps by converting raw citizen data into actionable mathematical scores, prioritizing resource allocation dynamically.

| Dimension | Traditional Systems | CivicGuard Platform |
| :--- | :--- | :--- |
| **Queue Management** | First-In, First-Out (FIFO) | Risk-Indexed Prioritization Queue |
| **Hotspot Detection** | Manual boundary drawing | Automatic Spatial-Temporal Clustering |
| **Dispatch Basis** | Citizen call volume | Expected Risk Reduction & SLA Threat |
| **Planning Mode** | Purely reactive response | Predictive 7d/30d Forecast Simulation |

---

## Key Features & Mathematical Foundations

### 1. Risk-Aware Reporting
Citizens submit reports classified under distinct municipal hazard categories:
* **Road Hazards**: Potholes, road erosion, missing covers.
* **Water & Sewer**: Flooded streets, broken water mains, open sewage.
* **Waste Management**: Illegal dump sites, overflowing public bins.
* **Infrastructure Failure**: Broken streetlights, collapsed cables.
* **Construction Hazards**: Unsecured construction zones, falling debris.

Every submission records geolocation coordinates, severity estimates, description text, and optional photo uploads.

---

### 2. Explainable Risk Engine
Each incident receives a dynamic risk score between `0` and `100` calculated by a multi-factor formula. This removes arbitrary metrics, giving operators a transparent justification for every index value:

$$\text{Final Risk} = \text{Clamp}(\text{Base Severity} \times \text{Duration Factor} \times \text{Density Factor} \times \text{Weather Multiplier}, 0, 100)$$

The score breaks down into five measurable contributions:
* **Severity Contribution**: Determined by the hazard category base index (Sewer: 45, Infrastructure: 30, Road: 25, Garbage: 15) and citizen input.
* **Density Contribution**: Proximity coefficient based on other unresolved hazards within a 500m radius.
* **Community Validation**: Upvotes and verifications submitted by local citizens.
* **Weather Impact**: Multiplicative scaling applied during environmental crises. Rain increases sewer and road risk weights by `1.2x`; Heat increases waste risk weights by `1.15x`.
* **Duration Penalty**: Time elapsed since submission without dispatch, compounding overall risk score by `1.05x` every 24 hours.

---

### 3. Community Risk Index (CRI)
The Community Risk Index (CRI) measures localized hazard severity across city zones. Neighborhoods are ranked continuously using a weighted aggregation of their active incident database:

$$\text{CRI}_{\text{Sector}} = \text{Clamp}\left( \sum (\text{Active Incident Risk}) \times \alpha + (\text{Critical Incident Count}) \times \beta + \text{Weather Penalty}, 0, 100 \right)$$

* **Hotspot Telemetry**: Neighborhoods crossing a CRI of `80` are flagged as **Critical Threat Zones**.
* **Prerender Guardrails**: Neighborhoods with fewer than three active reports are marked with a "Limited Data" badge, preventing skewed indices from misrepresenting low-sample zones.

---

### 4. Escalation Detection
The system monitors reports in a rolling spatial-temporal window. If three or more severe reports of the same type are logged within a 2.5km radius inside a 48-hour window, the engine flags an **Active Escalation Event**:
* Alerts are assigned status indicators (**Critical**, **Warning**, **Info**) based on report velocity.
* Dispatch recommendation profiles automatically adjust to prioritize escalation zones.

---

### 5. Executive Dashboard
Designed for municipal managers and commissioners to gauge citywide health in under 15 seconds:
* **Municipal Risk Radar**: Spotlights the highest-risk hotspot sector and lists its underlying risk contributions.
* **Situation Summary**: Displays Live CRI, active critical issue count, and unresolved SLA alerts.
* **Database Telemetry Ticker**: Logs database writes, last forecast synchronization times, and API response latency.

---

### 6. Command Center
The operational control panel for municipal dispatchers:
* **Interactive Risk Heatmap**: Real-time geospatial plot mapping hazard coordinates and density bands.
* **Priority Dispatch Queue**: Sorts issues dynamically based on calculated risk score.
* **Resource Allocation recommendations**: Computes crew deployments matching available resources to high-threat zones.
* **Explainability Panel**: Visualizes the mathematical breakdown of every selected ticket's risk score.

---

### 7. Forecast Center & Intervention Sandbox
A predictive planning environment displaying risk outlooks and simulated interventions:
* **7-Day & 30-Day Projections**: Projections calculated by analyzing unresolved backlogs, escalation rates, and historical resolution velocities.
* **Forecast Drivers**: Identifies what factors (e.g., impending rain forecast, crew shortage) are driving the projected risk index.
* **Intervention Simulator**: Allows supervisors to check which issues to resolve, showing the projected CRI drop, critical issues prevented, and escalations avoided *before* dispatching crews.

---

## Core REST API Endpoints

The CivicGuard Express server exposes a comprehensive set of REST endpoints for data ingestion, analytics calculation, and simulation:

### Authentication Endpoints
* `POST /api/auth/login`: Handles user login for role-based sessions (Citizen, Operator, Supervisor, Admin). Returns a JWT access token.
* `POST /api/auth/logout`: Clears session tokens and local cache logs.

### Incident Endpoints
* `GET /api/issues`: Retrieves all active incidents. Supports query parameters for weather filters, neighborhood boundaries, and status tags.
* `POST /api/issues`: Submits a citizen report. Accepts payload parameters: `issueType`, `latitude`, `longitude`, `severity`, and `description`.
* `PUT /api/issues/:id/status`: Updates an issue's status (e.g., `assigned`, `resolved`). Restricts crew assignment changes to Operator, Supervisor, or Admin roles.
* `POST /api/issues/vote`: Upvotes an active report to increase its community validation metric.

### Analytics & Projections Endpoints
* `GET /api/analytics/dashboard`: Computes citywide aggregates, live CRI, database diagnostics, and active tick logs.
* `GET /api/analytics/forecast`: Processes forecasting telemetry, return 7d/30d CRI predictions, and active forecast drivers.
* `POST /api/analytics/simulate`: Evaluates sandbox interventions. Accepts an array of issue IDs to simulate resolving, returning projected risk reductions and prevented escalations.

---

## System Architecture

```
                      ┌────────────────────────────────┐
                      │       Citizen Web Portal       │
                      └───────────────┬────────────────┘
                                      │ HTTPS / REST
                                      ▼
                      ┌────────────────────────────────┐
                      │  Node.js / Express API Gateway │
                      └───────────────┬────────────────┘
                                      │ Mongoose ODM
                                      ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │                        Core Platform Engines                         │
   ├─────────────────────┬───────────────────────────┬────────────────────┤
   │  Dynamic CRI Model  │  Explainable Risk Engine  │  SLA Monitor       │
   ├─────────────────────┼───────────────────────────┼────────────────────┤
   │  Escalation Engine  │  Forecast Horizon Model   │  Incident Seeding  │
   └─────────────────────┴───────────────────────────┴────────────────────┘
                                      │
                                      ▼
                      ┌────────────────────────────────┐
                      │       MongoDB Database         │
                      └────────────────────────────────┘
```

---

## Directory Structure

```
smart-civic-risk-system/
├── backend/
│   ├── controllers/      # API Request handlers (Issues, Analytics, Auth)
│   ├── middleware/       # JWT verification, Role-based auth, file filters
│   ├── models/           # Mongoose schemas (User, Issue, History, Event)
│   ├── routes/           # REST endpoints mapping
│   ├── seeds/            # Seeding tools & CLI for mock datasets
│   ├── services/         # Core business logic (Risk Engine, Forecasts)
│   ├── tests/            # Automated integration test runner & suites
│   ├── server.js         # Backend Express server initialization
│   └── package.json
├── frontend/
│   ├── app/              # Next.js App Router views (dashboard, authority, report)
│   ├── components/       # UI elements (Map, Charts, Upload Form, Sidebar)
│   ├── utils/            # Axios API wrappers
│   ├── package.json
│   └── tsconfig.json
├── API_DOCS.md           # API endpoint specifications
└── README.md
```

---

## Technology Stack

### Frontend
* **Core Framework**: Next.js 16 (App Router), React 18, TypeScript.
* **Styling**: Tailwind CSS.
* **Data Visualization**: Recharts (dynamic trend lines, area plots, bar charts).
* **Maps & Geospatial**: Leaflet & React-Leaflet (interactive map tiles, custom icons, heatmaps).

### Backend
* **Runtime**: Node.js.
* **Server Framework**: Express.js.
* **Database Driver**: Mongoose ODM.
* **Security & Utilities**: JWT (JsonWebToken), bcryptjs, Helmet (header security), Express Rate Limit.

### Database
* **Engine**: MongoDB.
* **Optimizations**: 2dsphere indexing for geolocation queries, compound indexing on status and risk variables.

---

## User Roles & Permissions

The platform includes four role definitions to support administrative oversight and operational division of labor:

| Role | Submit Reports | Verify Reports | Queue Triage | Dispatch Crews | Analyze Projections | System Settings |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Citizen** | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Operator** | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Supervisor**| ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Visual Layouts

The system is configured with five workspaces:
1. **Landing Page (`/`)**: Introduces the platform architecture, citizen reporting pipeline, and municipal advantages.
2. **Report Wizard (`/report`)**: A multi-step form for citizens to log issues, select categories, input coordinates, and verify reports.
3. **Executive Dashboard (`/dashboard`)**: Displays high-level analytics, active tickers, database diagnostics, and city risk alerts.
4. **Command Center (`/authority`)**: The primary dispatch dashboard, containing maps, allocation recommendations, and the prioritized issue grid.
5. **Forecast Center (`/authority/forecast`)**: Displays long-term projections, risk drivers, and the Intervention Sandbox.

---

## Local Development Setup

### Prerequisites
* **Node.js** (v18.x or v20.x recommended)
* **MongoDB** (Local instance running on `localhost:27017` or MongoDB Atlas URI)

### Installation
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/SharmaHemant001/smart-civic-risk-system.git
   cd smart-civic-risk-system
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/civicguard
   NODE_ENV=development
   JWT_SECRET=supersecretkeyforjwttokenauth
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_HACKATHON_MODE=true
   ```

---

### Seeding the Database
The platform includes built-in seeding scripts to construct the demo dataset containing mock tickets across Delhi NCR (Connaught Place, Saket, Dwarka, Noida, etc.):
```bash
# From the backend directory
# This resets any existing data and populates fresh seed data
npm run seed:reset
```

### Running the Application
1. **Start the Backend API**:
   ```bash
   cd backend
   npm run dev
   ```
   The backend server will spin up on `http://localhost:5000`.

2. **Start the Frontend Client**:
   ```bash
   cd frontend
   npm run dev
   ```
   The client application will run on `http://localhost:3000`. Open your browser and navigate to this address.

3. **Production Build Compilation**:
   Verify compilation and compile assets for production:
   ```bash
   cd frontend
   npm run build
   ```

---

## Automated Test Suite

CivicGuard includes 11 automated test suites validating every core computational formula, database model, security rule, and API endpoint:
* `riskEngine.test.js`: Validates severity weights, weather multiplier scaling, and clamping limits.
* `auth.test.js` & `refresh.test.js`: Tests JWT authentication tokens, signature validation, and token rotation.
* `rbac.test.js`: Confirms route access restrictions match user role assignments.
* `security.test.js`: Evaluates brute-force lockout thresholds and sanitization filters.
* `validation.test.js`: Checks request body constraints and type definitions.
* `authority.test.js` & `forecast.test.js`: Validates crew recommendations, CRI math, and projections.
* `ai.test.js`: Tests classification routing fallbacks.
* `route.test.js`: Tests geospatial corridor calculations and alternative route matching.
* `escalation.test.js`: Tests spatial-temporal clustering triggers for reports.
* `performance.test.js`: Benchmarks query latency between indexed and non-indexed database collections.

### Running Tests
To run all test suites and generate verification statistics:
```bash
cd backend
node tests/run_all.js
```

### Test Suite Output Verification Example
When the command executes successfully, the test runner outputs:
```
======================================================
📊 FINAL TEST EXECUTION SUMMARY
======================================================
riskEngine.test.js        : ✅ PASS
auth.test.js              : ✅ PASS
rbac.test.js              : ✅ PASS
security.test.js          : ✅ PASS
validation.test.js        : ✅ PASS
authority.test.js         : ✅ PASS
forecast.test.js          : ✅ PASS
ai.test.js                : ✅ PASS
route.test.js             : ✅ PASS
escalation.test.js        : ✅ PASS
performance.test.js       : ✅ PASS
------------------------------------------------------
Total: 11 | Passed: 11 | Failed: 0
======================================================
```

---

## Project Status & Focus Areas
* **Status**: Prototype Showcase Ready
* **Target Segments**: Smart India Hackathon, Smart City Review Boards, Municipal Dispatch Automation.
* **Core Objectives**: Proving the efficacy of mathematical risk models over raw complaint counters, geospatial hotspot clustering, and simulation sandboxes for urban decision support.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
