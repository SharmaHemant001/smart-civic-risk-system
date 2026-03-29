# CivicGuard - Smart Civic Risk System

CivicGuard is a community-driven civic risk platform that helps citizens report local problems, verify them through public feedback, and understand how those issues affect everyday travel.

Instead of functioning like a passive complaint board, CivicGuard turns raw civic reports into visible, prioritized, route-aware risk intelligence.

## Why This Matters

Urban civic issues such as potholes, garbage piles, sewer leaks, and unsafe construction usually suffer from four major problems:

- the same issue gets reported repeatedly without consolidation
- genuine issues are hard to verify after reporting
- authorities and users struggle to understand which issues matter most
- route planning and civic reporting stay disconnected

This creates noise instead of actionable public insight.

## What CivicGuard Does

CivicGuard combines reporting, verification, prioritization, and navigation into one workflow:

- report issues with image and live location
- merge duplicate nearby reports into a stronger civic signal
- calculate weighted risk scores using severity, frequency, and location priority
- visualize issue concentration through a live civic risk heatmap
- help users inspect issues affecting their route
- allow the community to validate whether issues are still unresolved or already fixed

## Standout Features

### 1. Smart Issue Reporting

Users can report:

- pothole
- garbage
- sewer
- construction

Each report includes:

- image
- GPS coordinates
- issue type
- readable location name through reverse geocoding

### 2. Duplicate-Aware Civic Intelligence

If multiple users report the same nearby issue, CivicGuard does not flood the system with repeated complaints.

Instead, it:

- merges duplicate reports
- increases the issue's confidence through votes
- refreshes location and image data when needed

This keeps the system cleaner and makes repeated complaints more meaningful.

### 3. Explainable Risk Scoring

This is the core intelligence layer of CivicGuard.

Every issue is scored using:

`Risk Score = Severity + Frequency + Location Priority`

Weighted formula:

`Risk Score = (Severity × 0.5) + (Frequency × 0.3) + (Location Priority × 0.2)`

Where:

- `Severity` depends on issue type
- `Frequency` depends on community votes and repeated reporting
- `Location Priority` depends on nearby active issue density

Risk levels:

- `80+` → Critical
- `50-79` → Medium
- `<50` → Low

This makes the system transparent, explainable, and stronger than a simple complaint dashboard.

### 4. Community Validation

Citizens are not limited to reporting issues.

They can also:

- upvote existing issues
- help confirm whether an issue has been resolved

When enough community confirmations are received and positive feedback outweighs negative feedback, the system can mark an issue as resolved.

### 5. Route-Aware Risk Visibility

CivicGuard helps users go beyond reporting by connecting civic intelligence to mobility.

Users can:

- enter a route
- view issues affecting that route
- understand whether the route passes through risky civic zones

This makes the platform useful not only for authorities, but also for everyday citizens and commuters.

### 6. Live Civic Risk Heatmap

The map includes a live heatmap layer based on issue location, risk score, and community engagement.

This helps users:

- instantly spot danger clusters
- understand concentrated problem zones
- interpret the system as a risk intelligence platform rather than a simple marker map

### 7. Nearby Community Verification

The dashboard highlights nearby issues that still need verification.

This allows users to:

- discover civic issues near them
- open them directly on the map
- participate in localized validation

### 8. Issue Lifecycle Management

Issues are not left active forever without context.

CivicGuard re-evaluates stale reports over time so that:

- inactive issues do not clutter the system
- unresolved issues remain visible
- the civic intelligence layer stays relevant

## Workflow

`Report -> Merge -> Score -> Visualize -> Validate -> Resolve -> Navigate`

## Dashboard Experience

The dashboard currently provides:

- daily and total issue counts
- critical-risk count
- issue distribution insights
- top affected areas
- nearby issues needing verification
- a clear explanation of how risk is scored

## Tech Stack

### Frontend

- Next.js
- React
- Tailwind CSS
- React Leaflet
- Leaflet Heatmap
- Recharts

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- cron-based lifecycle handling

## Demo Flow

1. Report a civic issue with image and location
2. Let the system merge duplicates and assign a weighted risk score
3. Open the dashboard to inspect critical zones and nearby issues
4. View the issue on the map and observe the heatmap cluster
5. Plan a route and inspect issues along that route
6. Upvote or validate whether the issue has been resolved

## What Makes CivicGuard Different

Most civic apps stop at complaint collection.

CivicGuard goes further by combining:

- geotagged reporting
- duplicate-aware aggregation
- explainable weighted risk scoring
- route-aware risk visibility
- live heatmap-based danger clustering
- community-driven issue resolution

That combination turns scattered public complaints into structured civic risk intelligence.

## Current Scope

- Reporting with image and location
- Duplicate issue handling
- Weighted risk scoring
- Community validation
- Dashboard analytics
- Nearby verification discovery
- Route-based issue visibility
- Live civic risk heatmap

## Current Limitations

- no authentication or identity-based voting yet
- validation is browser/device based
- no authority-side operational dashboard yet
- advanced anti-fraud logic is still future work

## Future Scope

- trusted user accounts and validator reputation
- municipal authority dashboard
- push notifications for nearby users
- stronger nearby-only validation controls
- predictive civic trend analysis
- smarter moderation and escalation workflows

## Ideal Use Case

CivicGuard is designed for hackathon-scale civic intelligence use cases where citizens, communities, and local bodies need a simple but powerful way to:

- report problems
- identify priority zones
- validate issue resolution
- understand route-level civic risk

## Tagline

Community-driven civic risk intelligence with route-aware safety insights.

