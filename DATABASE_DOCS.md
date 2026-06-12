# 🗄️ CivicGuard Database Documentation

CivicGuard utilizes **MongoDB** as its primary data store, using **Mongoose** for schema definition and object modeling. The database is designed for high-concurrency spatial-temporal operations, incorporating extensive indexing, role definitions, soft deletes, and audit trails.

---

## 🗺️ Mongoose Schema Definitions

The platform is built on five core database models:

### 1. `User` Schema
Tracks user registration, authorization roles, token rotations, and login lockouts.
*   **Fields**:
    *   `name` (String, Required, Trimmed): Full name of the user.
    *   `email` (String, Required, Unique, Lowercase, Trimmed): User email address.
    *   `password` (String, Required, Select: false): BCrypt hashed password.
    *   `role` (String, Required, Default: `"Citizen"`): Role classification. Options: `Citizen`, `FieldCrew`, `Dispatcher`, `Manager`, `Admin`.
    *   `isDeleted` (Boolean, Default: `false`): Soft delete flag.
    *   `failedLoginAttempts` (Number, Default: `0`): Tracked for account lockout.
    *   `lockUntil` (Date, Default: `null`): Account unlock timestamp.
    *   `refreshTokenHash` (String, Default: `null`, Select: false): Rotated SHA-256 hashed refresh token.

### 2. `Issue` Schema
Represents citizen reports. Embeds a GeoJSON Point for spatial indexing and tracks community voting and validation.
*   **Fields**:
    *   `title` (String, Required, Trimmed): Title of report.
    *   `description` (String, Required, Trimmed): Detailed description.
    *   `issueType` (String, Required): Type of issue. Options: `pothole`, `garbage`, `sewer`, `construction`.
    *   `latitude` (Number, Required): Raw coordinate.
    *   `longitude` (Number, Required): Raw coordinate.
    *   `location` (GeoJSON Point, Required): Spatial point: `{ type: "Point", coordinates: [lon, lat] }`.
    *   `status` (String, Required, Default: `"pending"`): Current status. Options: `pending`, `in-progress`, `resolved`, `needs-review`, `invalid`.
    *   `votes` (Number, Default: `0`): Cumulative validation vote count.
    *   `votesList` (Array of ObjectId): User IDs of upvoters to prevent vote spam.
    *   `imageUrl` (String, Default: `""`): Relative file path of the uploaded image.
    *   `expiresAt` (Date, Required): Temporal threshold for the auto-expiry cron job.
    *   `isDeleted` (Boolean, Default: `false`): Soft delete flag.
    *   `locationName` (String, Default: `"Bangalore"`): Reverse-geocoded neighborhood name.
    *   `riskValue` (Number, Default: `0`): Direct numeric priority index calculated by the `RiskEngine`.
    *   `riskScore` (String, Default: `"Low"`): Mapped risk label. Options: `Low`, `Medium`, `High`, `Critical`.
    *   `finalRisk` (Number, Default: `0`): Weighted risk score incorporating weather factors and neighborhood density.

### 3. `EscalationEvent` Schema
Persists triggered spikes in issue reports within localized areas.
*   **Fields**:
    *   `clusterId` (String, Required): Location/neighborhood cluster name where the spike occurred.
    *   `issueCount` (Number, Required): Number of active reports in the rolling 1-hour window.
    *   `oldRisk` (Number, Required): Cumulative final risk of the area prior to the current window.
    *   `newRisk` (Number, Required): Cumulative final risk after the spike reports.
    *   `riskIncrease` (Number, Required): Calculated percentage risk growth.
    *   `status` (String, Required): Alert severity level. Options: `Info` ($<10\%$), `Warning` ($10-25\%$), `Critical` ($\ge 25\%$).
    *   `trendDirection` (String, Required, Default: `"Increasing"`): Trend vector indicator.
    *   `createdAt` (Date, Default: `Date.now`): Timestamp of the escalation check.

### 4. `RouteHistory` Schema
Logs OSRM route risk corridor calculations requested by navigation users.
*   **Fields**:
    *   `startLocation` (Object): `{ latitude: Number, longitude: Number }`.
    *   `endLocation` (Object): `{ latitude: Number, longitude: Number }`.
    *   `routes` (Array): Detailed metrics for both analyzed routes (distance, duration, routeRisk, criticalIssues, routeId).
    *   `recommendedRoute` (String): ID of the recommended route (e.g. `"Route B"`).
    *   `riskReduction` (Number): Percentage risk improvement achieved by selecting the recommended route.
    *   `createdAt` (Date, Default: `Date.now`): Calculation timestamp.

### 5. `AuditLog` Schema
Immutable record of all high-severity platform actions.
*   **Fields**:
    *   `action` (String, Required): Action identifier (e.g., `REGISTER`, `LOGIN`, `ACCOUNT_LOCKED`, `BULK_UPDATE`, `CSV_EXPORT`).
    *   `email` (String, Trimmed): User email linked to the action.
    *   `role` (String): Role of the performing user.
    *   `details` (String): Contextual metadata describing the action.
    *   `ip` (String): Requesting client IP.
    *   `severity` (String, Required): Severity level. Options: `INFO`, `WARNING`, `CRITICAL`.
    *   `timestamp` (Date, Default: `Date.now`): Log event creation timestamp.

---

## ⚡ Indexing Strategy

To optimize database lookups and prevent query bottlenecks at scale, we configure the following database indices on the `issues` and `users` collections:

### 1. Issues Collection Indices
*   `location`: `2dsphere` spatial index. Enables ultra-fast bounding box and corridor queries (such as checking if issues fall within a 50m radius of a route segment geometry).
*   `status`: B-tree index. Optimizes the command center's default dashboard rendering of unresolved issues.
*   `createdAt`: Descending B-tree index. Optimizes date queries and historical sorting.
*   `riskScore`: Index for sorting by priority levels.
*   `slaDeadline`: Index for warning operators of impending breach.
*   `isDeleted`: Index to quickly exclude soft-deleted issues.
*   `(latitude, longitude, status)`: Compound spatial filter. Used for geohash and clustering logic.
*   `(status, riskScore)`: Compound B-tree index. Accelerates dashboard categorization filters.

### 2. Users Collection Indices
*   `email`: B-tree unique index. Guarantees account email uniqueness and speeds up login lookups.
*   `isDeleted`: Excludes deleted users from management panels.

---

## 🧹 Soft-Delete & Hook Behaviors

To preserve data integrity, the system implements **soft deletes** rather than raw record deletion:
1.  **Filter Hooks**: Pre-find and pre-aggregate queries automatically append `{ isDeleted: { $ne: true } }` at the driver layer to hide deleted items from dashboards, maps, and reports.
2.  **Location Hooks**: The `Issue` pre-save hook automatically parses raw `latitude` and `longitude` fields and formats them into a GeoJSON `location` object:
    ```javascript
    issueSchema.pre("save", function (next) {
      if (this.isModified("latitude") || this.isModified("longitude")) {
        this.location = {
          type: "Point",
          coordinates: [this.longitude, this.latitude]
        };
      }
      next();
    });
    ```
