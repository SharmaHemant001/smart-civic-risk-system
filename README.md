# CivicGuard - Smart Civic Risk System

CivicGuard is a platform that helps people report civic issues, verify them through the community, and understand risks around them — especially while traveling.

We built this after noticing how difficult it is to know about unsafe roads or local issues before actually encountering them.

---

## Problem

Urban issues like potholes, garbage, sewer leaks, and unsafe construction are:

* reported multiple times without coordination
* hard to verify after reporting
* not prioritized effectively
* completely disconnected from navigation and daily travel

Most existing systems collect complaints, but don’t help users understand real-world risk.

---

## Solution

CivicGuard transforms simple reports into **actionable civic intelligence**.

It allows users to:

* report issues with location and images
* avoid duplicate complaints
* validate issues through community feedback
* identify high-risk areas
* view issues along their travel routes
* visualize danger concentration through a live civic risk heatmap

---

## Key Features

### 1. Issue Reporting

Users can report:

* pothole
* garbage
* sewer
* construction

Each report includes:

* image
* GPS location
* issue type

---

### 2. Duplicate-Aware System

Nearby reports of the same issue are merged instead of creating clutter.

This helps:

* reduce noise
* strengthen confidence through votes

---

### 3. Community Validation

Users can:

* upvote issues
* confirm if an issue is resolved

Issues are marked resolved when:

* enough users confirm
* positive votes outweigh negative

---

### 4. Risk Prioritization

Issues are ranked based on:

* issue severity
* community frequency
* local issue density

This helps highlight critical problems.

CivicGuard uses a weighted risk model:

`riskScore = severity * 0.5 + frequency * 0.3 + locationWeight * 0.2`

Risk levels are classified as:

* `80+` → Critical
* `50-79` → Medium
* `<50` → Low

---

### 5. Dashboard Insights

The dashboard shows:

* total and recent issues
* high-risk areas
* issue distribution
* nearby issues needing verification

---

### 6. Route-Based Risk View (Key Feature 🚀)

Users can enter a route and see issues along the path.

This helps:

* avoid unsafe roads
* make better travel decisions

---

### 7. Live Civic Risk Heatmap

The map includes a live heatmap layer built from issue locations, risk score, and community engagement.

This helps users:

* identify danger clusters instantly
* understand which zones have concentrated civic risk
* see the system as a true risk intelligence platform, not just a complaint list

---

### 8. Issue Lifecycle Management

Each issue is re-evaluated over time.

* inactive issues are updated automatically
* system stays clean and relevant

---

## Workflow

Report → Validate → Prioritize → Resolve → Navigate Safely

---

## Tech Overview

### Frontend

* Next.js, React, Tailwind
* Leaflet (maps)
* Leaflet Heatmap
* Recharts

### Backend

* Node.js, Express
* MongoDB
* Cron jobs

---

## Demo Flow

1. Report an issue
2. See it on the map
3. Observe the live civic risk heatmap
4. Upvote / validate
5. View dashboard insights
6. Explore route-based risks

---

## Current Scope

✔ Reporting with image + location
✔ Duplicate handling
✔ Community validation
✔ Dashboard analytics
✔ Route-based issue visibility
✔ Live civic risk heatmap

---

## Limitations

* no user authentication yet
* validation is not identity-based
* advanced fraud detection not implemented

---

## Future Improvements

* user accounts and trust system
* authority dashboard
* notification system
* smarter validation and moderation

---

## Tagline

CivicGuard helps people report, verify, and navigate civic issues using community-driven intelligence.

---

## Overview

CivicGuard turns scattered civic complaints into a structured, community-verified system that not only tracks issues but also helps users avoid risks in real time through route-based insights.

