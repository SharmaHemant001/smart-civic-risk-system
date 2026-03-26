import math

# 📍 Distance calculation (Haversine formula)
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371  # km

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c  # km


# 🔁 Duplicate check
def check_duplicate(new_issue, existing_issues):
    for issue in existing_issues:
        if issue["issueType"] == new_issue["issueType"]:
            distance = calculate_distance(
                new_issue["latitude"],
                new_issue["longitude"],
                issue["latitude"],
                issue["longitude"]
            )

            if distance < 0.1:  # 100 meters
                return True

    return False


# ⚠️ Risk calculation
def calculate_risk(issue_type, votes):
    if issue_type in ["pothole", "sewer"]:
        risk = "High"
    elif issue_type == "garbage":
        risk = "Medium"
    else:
        risk = "Low"

    # Increase risk with votes
    if votes > 10 and risk == "Medium":
        risk = "High"
    elif votes > 15:
        risk = "High"

    return risk