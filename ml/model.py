import requests

API_KEY = "qK6tet4fjQfuFOL2XIdH"

# ✅ FIXED URL
WORKFLOW_URL = "https://serverless.roboflow.com/workflow/devils-workspace-ho2vl/detect-and-classify"


def predict_issue(image_url):
    try:
        print("📤 Sending to Roboflow:", image_url)

        response = requests.post(
            WORKFLOW_URL,
            params={"api_key": API_KEY},   # cleaner way
            json={
                "image": image_url
            }
        )

        data = response.json()
        print("🔥 FULL RESPONSE:", data)

        # ✅ safer parsing
        outputs = data.get("outputs", [])

        if outputs:
            predictions = outputs[0].get("predictions", [])   

            if predictions:
                label = predictions[0].get("class", "")
                confidence = predictions[0].get("confidence", 0)

                print(f"✅ Detected: {label} ({confidence:.2f})")

                # 🔥 Mapping
                label_lower = label.lower()

                if "pothole" in label_lower:
                    return "pothole"
                elif "garbage" in label_lower:
                    return "garbage"
                elif "sewer" in label_lower or "drain" in label_lower:
                    return "sewer"
                else:
                    return "construction"

        print("⚠️ No predictions → fallback")
        return "construction"

    except Exception as e:
        print("❌ ML ERROR:", e)
        return "construction"