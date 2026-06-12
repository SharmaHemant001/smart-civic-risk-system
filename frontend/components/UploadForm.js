"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import API from "../utils/api";

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

const issueOptions = [
  { key: "pothole", label: "Road Hazard", subText: "Pothole, Road Damage, Open Manhole", icon: "🚧" },
  { key: "sewer", label: "Water & Sewer", subText: "Sewer, Water Leakage, Flooding", icon: "💧" },
  { key: "garbage", label: "Waste Management", subText: "Garbage", icon: "🗑️" },
  { key: "construction", label: "Construction Hazard", subText: "Construction Risk", icon: "🏗️" },
  { key: "infrastructure_damage", label: "Infrastructure Failure", subText: "Streetlight Failure", icon: "⚡" },
  { key: "other", label: "Other Hazard", subText: "Other", icon: "📋" },
];

const categoryMetadata = {
  pothole: {
    riskLevel: "High Risk",
    dispatchTeam: "PWD Road Maintenance Crew",
    escalationThreshold: "72 Hours",
    triggers: "Traffic disruption, vehicle damage risk, pedestrian hazard",
    color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  },
  sewer: {
    riskLevel: "Critical Risk",
    dispatchTeam: "Jal Board / Sanitation Dept",
    escalationThreshold: "24 Hours (Health Hazard)",
    triggers: "Flooding, health risk, toxic gas build-up, water contamination",
    color: "text-rose-400 border-rose-500/20 bg-rose-500/5",
  },
  garbage: {
    riskLevel: "Medium Risk",
    dispatchTeam: "Municipal Solid Waste Team",
    escalationThreshold: "48 Hours",
    triggers: "Disease outbreak vector, visual clutter, odor complaints",
    color: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
  },
  construction: {
    riskLevel: "High Risk",
    dispatchTeam: "Building Safety & Inspection Dept",
    escalationThreshold: "48 Hours",
    triggers: "Unsecured scaffolding, sidewalk blockage, structural danger",
    color: "text-orange-400 border-orange-500/20 bg-orange-500/5",
  },
  infrastructure_damage: {
    riskLevel: "Medium-High Risk",
    dispatchTeam: "Power & Streetlight Maintenance",
    escalationThreshold: "36 Hours",
    triggers: "Dark alley hazard, crime prevention zones, electrical damage",
    color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
  },
  other: {
    riskLevel: "Variable Risk",
    dispatchTeam: "General Grievance Response Desk",
    escalationThreshold: "96 Hours",
    triggers: "Unclassified municipal issue requiring evaluation",
    color: "text-slate-400 border-slate-500/20 bg-slate-500/5",
  },
};

const severityOptions = [
  { key: "Low", label: "Low", desc: "Minor inconvenience", color: "border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400" },
  { key: "Medium", label: "Medium", desc: "Requires municipal attention", color: "border-amber-500/20 hover:bg-amber-500/10 text-amber-400" },
  { key: "High", label: "High", desc: "Impacts mobility, infrastructure, or public safety", color: "border-orange-500/20 hover:bg-orange-500/10 text-orange-400" },
  { key: "Critical", label: "Critical", desc: "Immediate danger or major service disruption", color: "border-rose-500/20 hover:bg-rose-500/10 text-rose-400" },
];

const affectedAreaOptions = [
  { key: "Road", label: "Road / Street" },
  { key: "School Zone", label: "School Zone" },
  { key: "Hospital Zone", label: "Hospital Zone" },
  { key: "Market Area", label: "Market Area" },
  { key: "Residential Area", label: "Residential Area" },
  { key: "Government Facility", label: "Government Facility" },
  { key: "Public Utility", label: "Public Utility" },
  { key: "Other", label: "Other Area" },
];

export default function UploadForm() {
  const [step, setStep] = useState(1);
  const [issueType, setIssueType] = useState("");
  const [customIssueType, setCustomIssueType] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  
  // Location States
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMode, setLocationMode] = useState("gps"); // gps | search | landmark | pin
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [landmark, setLandmark] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const [affectedArea, setAffectedArea] = useState("");

  // Photo States
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  // Duplicate Check States
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateIssue, setDuplicateIssue] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [bypassDuplicate, setBypassDuplicate] = useState(false);

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Soft Auth States
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [simulatedLoadingText, setSimulatedLoadingText] = useState("");

  const handleGuestSubmit = () => {
    setShowLoginOverlay(false);
    handleSubmit(true);
  };

  const handleSoftCitizenVerification = async () => {
    setLoginLoading(true);
    setLoginError("");
    setSimulatedLoadingText("Authenticating Session...");

    setTimeout(() => {
      setSimulatedLoadingText("Loading Demo Citizen Profile...");
    }, 900);

    setTimeout(async () => {
      try {
        const res = await API.post("/auth/login", { email: "citizen-user@civicguard.gov" });
        const { accessToken, user } = res.data;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("user", JSON.stringify(user));
        
        // Dispatch login event
        window.dispatchEvent(new Event("civicguard-auth"));
        
        setShowLoginOverlay(false);
        setTimeout(() => {
          handleSubmit();
        }, 100);
      } catch (err) {
        console.error(err);
        setLoginError("Demo Citizen session is currently unavailable. You may continue as Guest.");
      } finally {
        setLoginLoading(false);
        setSimulatedLoadingText("");
      }
    }, 1800);
  };

  // GPS Geolocation trigger
  const handleGPSLocation = () => {
    setLocationLoading(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        let locName = "NCR Region";
        let fullAddr = "";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { "User-Agent": "civicguard-reporting/1.0" }
          });
          if (res.ok) {
            const data = await res.json();
            locName = data.address?.city || data.address?.town || data.address?.suburb || "NCR Region";
            fullAddr = data.display_name || "";
          }
        } catch (err) {
          console.error(err);
        }

        setLocation({
          latitude: lat,
          longitude: lng,
          locationName: locName,
          address: fullAddr || `NCR Region [${lat.toFixed(4)}, ${lng.toFixed(4)}]`
        });
        setLocationLoading(false);
      },
      (err) => {
        console.error(err);
        setMessage("⚠️ Geolocation access denied or unavailable. Please use Address Search.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // OSM Address Nominatim Query
  const handleAddressSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`, {
        headers: { "User-Agent": "civicguard-reporting/1.0" }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const displayName = item.display_name;
        const parts = displayName.split(",");
        const name = parts[0] || "NCR Region";

        setLocation({
          latitude: lat,
          longitude: lon,
          locationName: name,
          address: displayName
        });
      } else {
        setSearchError("❌ No location resolved. Try adding a city name.");
      }
    } catch (err) {
      console.error(err);
      setSearchError("⚠️ Geocoding service failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Landmark Resolve (Simulated geocoding with fallback to NCR center)
  const handleLandmarkSubmit = () => {
    if (!landmark.trim()) return;
    setLocation({
      latitude: 28.6139 + (Math.random() - 0.5) * 0.05,
      longitude: 77.2090 + (Math.random() - 0.5) * 0.05,
      locationName: landmark,
      address: `Landmark Area: ${landmark}, New Delhi, NCR`
    });
  };

  // Manual Coordinates Pin
  const handleCoordsSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setMessage("⚠️ Invalid coordinates format.");
      return;
    }
    setLocation({
      latitude: lat,
      longitude: lng,
      locationName: "NCR Coordinate Pin",
      address: `Manual Coordinate Mapping: [${lat.toFixed(5)}, ${lng.toFixed(5)}]`
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl("");
    }
  };

  // Duplicate Check Engine
  const runDuplicateCheck = async () => {
    if (!location || !issueType) return false;
    setDuplicateLoading(true);
    try {
      const res = await API.get(
        `/issues/check-duplicate?latitude=${location.latitude}&longitude=${location.longitude}&issueType=${issueType}`
      );
      if (res.data && res.data.duplicateFound) {
        setDuplicateIssue(res.data.issue);
        setShowDuplicateModal(true);
        setDuplicateLoading(false);
        return true;
      }
    } catch (err) {
      console.error("Duplicate checking failed:", err);
    }
    setDuplicateLoading(false);
    return false;
  };

  // Navigations
  const nextStep = async () => {
    setMessage("");
    if (step === 1 && !issueType) {
      return setMessage("⚠️ Hazard Type selection is required.");
    }
    if (step === 1 && issueType === "other" && !customIssueType.trim()) {
      return setMessage("⚠️ Please describe the custom hazard type.");
    }
    if (step === 2 && !severity) {
      return setMessage("⚠️ Severity level is required.");
    }
    if (step === 3 && description.trim().length < 10) {
      return setMessage("⚠️ Description must be at least 10 characters long.");
    }
    if (step === 4 && !location) {
      return setMessage("⚠️ Incident location is required.");
    }
    if (step === 4 && !affectedArea) {
      return setMessage("⚠️ Surrounding zone context is required.");
    }

    // Trigger duplicate check when leaving step 4 (Location & Category set)
    if (step === 4 && !bypassDuplicate) {
      const isDuplicate = await runDuplicateCheck();
      if (isDuplicate) return; // Halt navigation to show duplicate warning popup
    }

    setStep((prev) => Math.min(prev + 1, 6));
  };

  const prevStep = () => {
    setMessage("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit flow
  const handleSubmit = async (isGuest = false) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token && !isGuest) {
      setShowLoginOverlay(true);
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      let finalDescription = description;
      if (guestName || guestPhone || guestEmail) {
        const contactInfo = [];
        if (guestName) contactInfo.push(`Name: ${guestName}`);
        if (guestPhone) contactInfo.push(`Phone: ${guestPhone}`);
        if (guestEmail) contactInfo.push(`Email: ${guestEmail}`);
        finalDescription += `\n\n[Guest Submitter Info] ${contactInfo.join(" | ")}`;
      }
      if (notes.trim()) {
        finalDescription += ` | Notes: ${notes.trim()}`;
      }

      const payload = {
        issueType,
        severity,
        affectedArea,
        description: finalDescription,
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: location.locationName,
        address: location.address || "",
        customIssueType: issueType === "other" ? customIssueType : undefined,
        bypassDuplicate: true // User bypassed or verified
      };

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("issueType", payload.issueType);
        formData.append("severity", payload.severity);
        formData.append("affectedArea", payload.affectedArea);
        formData.append("description", payload.description);
        formData.append("latitude", String(payload.latitude));
        formData.append("longitude", String(payload.longitude));
        formData.append("locationName", payload.locationName);
        formData.append("address", payload.address);
        formData.append("bypassDuplicate", "true");
        if (payload.customIssueType) {
          formData.append("customIssueType", payload.customIssueType);
        }
        await API.post("/issues/upload", formData);
      } else {
        if (imageUrl) {
          payload.imageUrl = imageUrl;
        }
        await API.post("/issues/upload", payload);
      }

      setStep(8); // Complete
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to log report. Please verify parameters.");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm existing duplicate (Community verification)
  const handleConfirmDuplicate = async () => {
    if (!duplicateIssue) return;
    setSubmitting(true);
    try {
      await API.post(`/issues/${duplicateIssue._id}/confirm`);
      setShowDuplicateModal(false);
      setStep(8); // Set straight to success screen
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to confirm duplicate report.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setIssueType("");
    setCustomIssueType("");
    setSeverity("");
    setDescription("");
    setNotes("");
    setLocation(null);
    setAffectedArea("");
    setImageFile(null);
    setImageUrl("");
    setDuplicateIssue(null);
    setShowDuplicateModal(false);
    setBypassDuplicate(false);
    setMessage("");
  };

  const getStepName = () => {
    switch (step) {
      case 1: return "Hazard Type";
      case 2: return "Severity Level";
      case 3: return "Hazard Description";
      case 4: return "Geospatial Location";
      case 5: return "Photo Evidence";
      case 6: return "Review Risk Report";
      default: return "";
    }
  };

  // 🏁 SUCCESS SCREEN
  if (step === 8) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 space-y-6 text-white animate-fadeIn">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-full text-3xl shadow-lg animate-bounce">
          ✓
        </div>
        <div className="space-y-2.5">
          <h2 className="text-xl font-black">Report Received</h2>
          <p className="text-xs text-white/60 max-w-sm mx-auto leading-normal">
            Your report has been added to CivicGuard's Municipal Risk Intelligence Network.
          </p>
        </div>

        <div className="bg-indigo-950/20 border border-indigo-500/10 p-4 rounded-xl text-left text-xs max-w-xs w-full space-y-2">
          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Potential Contributions:</p>
          <div className="space-y-1 text-emerald-400 font-semibold">
            <div>✓ CRI Updated</div>
            <div>✓ Risk Analysis Triggered</div>
            <div>✓ Escalation Monitoring Updated</div>
            <div>✓ Resource Allocation Considered</div>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white min-h-[420px] flex flex-col justify-between relative">
      {/* 🔑 SOFT AUTH LOGIN OVERLAY */}
      {showLoginOverlay && (
        <div className="absolute inset-0 bg-slate-950/95 rounded-3xl p-6 flex flex-col justify-between z-50 overflow-y-auto animate-fadeIn">
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-black text-sm text-white">Submit Municipal Risk Report</h3>
              <p className="text-[10px] text-white/50 leading-relaxed">
                Submit this report anonymously as a guest, or enter simulated citizen session for tracking.
              </p>
            </div>

            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-xl text-center text-[10px] font-bold">
                {loginError}
              </div>
            )}

            {/* Guest Details Form */}
            <div className="space-y-2.5">
              <div>
                <input
                  type="text"
                  placeholder="Name (Optional)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Phone (Optional)"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email (Optional)"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none"
                />
              </div>

              <button
                onClick={handleGuestSubmit}
                disabled={loginLoading}
                className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-xs font-bold shadow-md cursor-pointer hover:scale-[1.01] active:scale-95 transition"
              >
                {loginLoading ? "Submitting..." : "Continue as Guest"}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 text-[9px] text-white/25 uppercase font-black tracking-wider py-1">
              <div className="h-px bg-white/10 flex-1" />
              <span>Or Simulated Access</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Optional Identity Verification Section */}
            <div className="bg-slate-900/40 border border-white/5 p-3.5 rounded-2xl space-y-2.5">
              <div className="text-left">
                <p className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wide">
                  Citizen Operations Access
                </p>
                <p className="text-[9px] text-white/50 leading-relaxed mt-0.5">
                  Enter a simulated citizen session to enable report status tracking and reputation rewards.
                </p>
              </div>

              <button
                onClick={handleSoftCitizenVerification}
                disabled={loginLoading}
                className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {loginLoading && simulatedLoadingText ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-indigo-400">{simulatedLoadingText}</span>
                  </div>
                ) : (
                  <>
                    <span>👤</span> Enter Demo Citizen Session
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowLoginOverlay(false)}
            className="w-full py-1.5 mt-3 text-[10px] text-white/40 font-semibold hover:text-white/60 transition cursor-pointer border border-transparent hover:border-white/5 rounded-xl"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ⚠️ DUPLICATE DETECTION MODAL OVERLAY */}
      {showDuplicateModal && duplicateIssue && (
        <div className="absolute inset-0 bg-slate-950/95 rounded-3xl p-6 flex flex-col justify-between z-50 animate-fadeIn">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center rounded-full text-2xl mx-auto">
              🚨
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-sm text-white">Possible Existing Report Found</h3>
              <p className="text-[10px] text-white/50 leading-relaxed">
                An active report of the same category was logged nearby in the last 7 days.
              </p>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Category:</span>
                <span className="font-bold capitalize text-white">{duplicateIssue.issueType}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Address:</span>
                <span className="font-semibold text-white truncate max-w-[150px]">{duplicateIssue.address || duplicateIssue.locationName}</span>
              </div>
              {duplicateIssue.description && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-white/40">Description:</span>
                  <p className="text-white/70 italic text-[11px] leading-relaxed line-clamp-2">
                    "{duplicateIssue.description}"
                  </p>
                </div>
              )}
              {duplicateIssue.communityConfirmations > 0 && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-2 rounded-xl text-center font-bold text-[10px] uppercase tracking-wide">
                  Confirmed by {duplicateIssue.communityConfirmations} residents
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleConfirmDuplicate}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-lg hover:scale-[1.01] active:scale-95 transition cursor-pointer"
            >
              {submitting ? "Processing..." : "👍 Confirm Existing Issue"}
            </button>
            <button
              onClick={() => {
                setBypassDuplicate(true);
                setShowDuplicateModal(false);
                setStep(5);
              }}
              className="w-full py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-white/60 font-semibold transition cursor-pointer"
            >
              Create New Report anyway
            </button>
          </div>
        </div>
      )}

      {/* 📊 VISUAL HORIZONTAL PATH PROGRESS INDICATOR */}
      <div className="w-full">
        <div className="flex items-center justify-between text-[9px] text-white/45 mb-2 font-black uppercase tracking-wider">
          <span>Risk Submission Progress</span>
          <span className="text-indigo-400 font-extrabold">{getStepName()}</span>
        </div>
        <div className="flex items-center justify-between gap-1 text-[9px] font-bold text-white/40 bg-slate-950/30 p-2 border border-white/5 rounded-xl overflow-x-auto select-none no-scrollbar">
          {[
            { id: 1, label: "1 Hazard" },
            { id: 2, label: "2 Severity" },
            { id: 3, label: "3 Desc" },
            { id: 4, label: "4 Location" },
            { id: 5, label: "5 Evidence" },
            { id: 6, label: "6 Review" },
          ].map((item) => (
            <div key={item.id} className="flex items-center gap-1 shrink-0">
              <span
                className={`px-2 py-0.5 rounded transition ${
                  step === item.id
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold shadow-sm scale-105"
                    : step > item.id
                    ? "text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10"
                    : "text-white/30"
                }`}
              >
                {step > item.id ? "✓ " : ""}{item.label}
              </span>
              {item.id < 6 && <span className="text-white/15">➔</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 🔮 STEP WORKFLOW PANELS */}
      <div className="flex-1 py-2 overflow-y-auto max-h-[360px]">
        
        {/* STEP 1: CATEGORY */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-white/60">
              Select the hazard type corresponding to this risk report.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {issueOptions.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setIssueType(item.key)}
                  className={`flex flex-col justify-between p-3 rounded-xl transition border text-left cursor-pointer min-h-[72px] ${
                    issueType === item.key
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg"
                      : "bg-slate-950/40 border-white/5 hover:bg-slate-950/60 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-bold">{item.label}</span>
                  </div>
                  <span className="text-[9px] text-white/40 leading-tight block mt-1">
                    {item.subText}
                  </span>
                </button>
              ))}
            </div>

            {/* Category Intelligence Preview Card */}
            {issueType && categoryMetadata[issueType] && (
              <div className={`border p-3.5 rounded-xl text-xs space-y-2 animate-fadeIn transition-all duration-300 ${categoryMetadata[issueType].color}`}>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[10px] uppercase tracking-wider">🧠 Hazard intelligence Profile</span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] font-extrabold uppercase">
                    {categoryMetadata[issueType].riskLevel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] leading-tight pt-1">
                  <div>
                    <span className="text-white/40 block">Dispatch Unit:</span>
                    <span className="font-semibold text-white/90">{categoryMetadata[issueType].dispatchTeam}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Escalation SLA:</span>
                    <span className="font-semibold text-white/90">{categoryMetadata[issueType].escalationThreshold}</span>
                  </div>
                </div>
                <div className="text-[10px] leading-normal pt-1 border-t border-white/5">
                  <span className="text-white/40 font-bold block mb-0.5">Risk Trigger Criteria:</span>
                  <span className="text-white/80">{categoryMetadata[issueType].triggers}</span>
                </div>
              </div>
            )}

            {issueType === "other" && (
              <div className="mt-3 space-y-1 animate-fadeIn">
                <label className="block text-[10px] font-black uppercase text-white/50">
                  Describe Custom Hazard Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Damaged Signage, Broken Guardrail..."
                  value={customIssueType}
                  onChange={(e) => setCustomIssueType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all"
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SEVERITY */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-white/60">
              Select severity level.
            </p>
            <div className="space-y-2.5">
              {severityOptions.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSeverity(item.key)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition border text-left cursor-pointer ${
                    severity === item.key
                      ? "bg-indigo-600/25 border-indigo-500 text-white shadow-md"
                      : "bg-slate-950/40 border-white/5 hover:bg-slate-950/60 hover:border-white/10"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                    severity === item.key ? "border-indigo-400" : "border-white/20"
                  }`}>
                    {severity === item.key && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block capitalize">{item.key}</span>
                    <span className="text-[10px] text-white/55 leading-normal block">{item.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: DESCRIPTION */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-white/60">
              Provide hazard description details. (Min. 10 characters required)
            </p>
            <div className="space-y-1">
              <span className="text-[9px] text-white/40 font-bold block uppercase">Examples:</span>
              <p className="text-[10px] text-white/55 leading-relaxed bg-slate-950/20 border border-white/5 p-2 rounded-xl">
                • "Water leakage near transformer"<br/>
                • "Open manhole outside school gate"<br/>
                • "Garbage accumulation blocking road access"
              </p>
            </div>
            <div className="space-y-1 relative">
              <textarea
                placeholder="Describe the hazard in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={400}
                className="w-full min-h-[90px] p-3 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs leading-normal transition-all"
              />
              <div className="absolute bottom-2.5 right-2.5 text-[9px] font-bold text-white/35">
                {description.length} / 400
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: LOCATION */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex border-b border-white/5 text-[10px] font-bold uppercase tracking-wider">
              {["gps", "search", "landmark", "pin"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLocationMode(mode)}
                  className={`flex-1 pb-2 border-b-2 transition text-center cursor-pointer ${
                    locationMode === mode ? "border-indigo-500 text-white font-extrabold" : "border-transparent text-white/40"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {locationMode === "gps" && (
              <div className="space-y-3">
                <p className="text-xs text-white/60">
                  Allow browser GPS access to retrieve coordinate mappings.
                </p>
                <button
                  onClick={handleGPSLocation}
                  disabled={locationLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-xs shadow-md hover:scale-[1.01] active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {locationLoading ? "📍 Retrieving GPS Coordinates..." : "📍 Get GPS Coordinates"}
                </button>
              </div>
            )}

            {locationMode === "search" && (
              <div className="space-y-3">
                <p className="text-xs text-white/60">
                  Search address on OpenStreetMap Nominatim.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search address (e.g. Saket, New Delhi)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                  <button
                    onClick={handleAddressSearch}
                    disabled={searchLoading}
                    className="px-4 py-2 bg-slate-900 border border-white/10 hover:border-white/20 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    {searchLoading ? "..." : "Resolve"}
                  </button>
                </div>
                {searchError && <p className="text-[10px] text-rose-400 font-bold">{searchError}</p>}
              </div>
            )}

            {locationMode === "landmark" && (
              <div className="space-y-3">
                <p className="text-xs text-white/60">
                  Input landmark nearby.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. outside school gate, near metro..."
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                  <button
                    onClick={handleLandmarkSubmit}
                    className="px-4 py-2 bg-slate-900 border border-white/10 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {locationMode === "pin" && (
              <div className="space-y-3">
                <p className="text-xs text-white/60">
                  Provide exact decimal coordinate inputs.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Latitude (e.g. 28.6139)"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="px-3 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Longitude (e.g. 77.2090)"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    className="px-3 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleCoordsSubmit}
                  className="w-full py-2 bg-slate-900 border border-white/10 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Submit Coordinates
                </button>
              </div>
            )}

            {location && (
              <div className="space-y-3 mt-4 animate-fadeIn">
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-center space-y-2">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block tracking-wider">Coordinates Mapped</span>
                  
                  {/* Live Minimap Container */}
                  <div className="h-44 w-full rounded-xl overflow-hidden border border-white/10 relative z-0">
                    <MapComponent
                      issues={location ? [{
                        _id: "temp-hazard",
                        latitude: location.latitude,
                        longitude: location.longitude,
                        riskScore: severity || "Low",
                        riskValue: 60,
                        issueType: issueType || "other",
                        locationName: location.locationName || "Reported Hazard"
                      }] : []}
                      selectedIssue={location ? {
                        latitude: location.latitude,
                        longitude: location.longitude
                      } : null}
                      route={null}
                    />
                  </div>

                  <span className="font-mono text-[11px] text-white block">
                    {location.latitude.toFixed(5)}° N, {location.longitude.toFixed(5)}° E
                  </span>
                  <span className="text-[10px] text-white/50 block truncate max-w-full italic">
                    {location.address || location.locationName}
                  </span>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-black uppercase text-white/50">
                    Surrounding Zone / Affected Area Context (Required)
                  </label>
                  <select
                    value={affectedArea}
                    onChange={(e) => setAffectedArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Select surrounding zone --</option>
                    {affectedAreaOptions.map((area) => (
                      <option key={area.key} value={area.key}>{area.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: SUPPORTING EVIDENCE */}
        {step === 5 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-white">Photo Evidence (Optional)</p>
            <p className="text-[10px] text-white/40 leading-normal">
              Future Enhancement: AI-assisted hazard categorization. No machine learning implementation required.
            </p>

            <div className="space-y-2.5">
              <label className="flex flex-col items-center justify-center border border-dashed border-white/15 hover:border-indigo-500/35 rounded-xl p-3 bg-slate-950/40 cursor-pointer transition">
                <span className="text-lg mb-0.5">📸</span>
                <span className="text-xs text-white/70 font-bold">
                  {imageFile ? `Attached: ${imageFile.name}` : "Upload Photo"}
                </span>
                <span className="text-[9px] text-white/35">JPEG, PNG, WEBP (Max 5MB)</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>

              <div className="flex items-center justify-center gap-2 text-[9px] text-white/40 uppercase font-black tracking-wide">
                <div className="h-px bg-white/10 flex-1" />
                <span>Or</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <input
                type="text"
                placeholder="Paste direct image URL link..."
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageFile(null);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/50 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none"
              />

              <div className="space-y-1 mt-2">
                <label className="block text-[10px] font-black uppercase text-white/50">
                  Additional Notes
                </label>
                <textarea
                  placeholder="Provide any additional notes or details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={200}
                  className="w-full min-h-[60px] p-2.5 rounded-xl bg-slate-950/50 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs leading-normal transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & SUBMIT */}
        {step === 6 && (
          <div className="space-y-3">
            <p className="text-xs text-white/60">
              Verify report configurations before pushing to the Command Center risk engine.
            </p>
            <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Hazard Type:</span>
                <span className="font-bold capitalize text-white">
                  {issueType === "other" ? `Other: ${customIssueType}` : issueType}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Severity:</span>
                <span className="font-bold capitalize text-white">{severity}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Affected Area:</span>
                <span className="font-bold capitalize text-white">{affectedArea}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Coordinates:</span>
                <span className="font-mono text-white/90">
                  {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "Not Set"}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Photo Evidence:</span>
                <span className="font-semibold text-white/90">
                  {imageFile || imageUrl ? "Attached ✓" : "None Provided"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-white/40">Hazard Description:</span>
                <p className="text-white/80 leading-normal italic truncate max-w-full">
                  "{description}"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🔮 INTELLIGENCE IMPACT PREVIEW */}
      {step >= 3 && step <= 6 && (
        <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3 space-y-1.5 animate-fadeIn">
          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">🔮 Intelligence Impact Preview</p>
          <p className="text-[10px] text-white/50 leading-relaxed">This report may contribute to:</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-emerald-400 font-semibold">
            <div>✓ Neighborhood Risk Index</div>
            <div>✓ Escalation Detection</div>
            <div>✓ Resource Allocation</div>
            <div>✓ SLA Monitoring</div>
            <div>✓ Risk Forecasting</div>
          </div>
        </div>
      )}

      {/* 📢 MESSAGE DISPLAY */}
      {message && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-xl text-center text-xs font-semibold">
          {message}
        </div>
      )}

      {/* 🧭 FOOTER NAVIGATION CONTROL BUTTONS */}
      <div className="flex items-center gap-3 border-t border-white/5 pt-4 mt-4">
        {step > 1 && (
          <button
            onClick={prevStep}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold tracking-wide transition cursor-pointer"
          >
            ← Back
          </button>
        )}
        {step < 6 ? (
          <button
            onClick={nextStep}
            disabled={duplicateLoading}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-xs font-bold tracking-wide transition cursor-pointer flex items-center justify-center gap-2"
          >
            {duplicateLoading ? "Checking Duplicates..." : "Next →"}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-lg hover:scale-[1.01] active:scale-95 transition cursor-pointer"
          >
            {submitting ? "Generating Risk Report..." : "Generate Risk Report ✓"}
          </button>
        )}
      </div>
    </div>
  );
}