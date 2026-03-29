"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "../../utils/api";
import Chart from "../../components/Chart";

type Issue = {
  _id: string;
  imageUrl: string;
  issueType: string;
  latitude: number;
  longitude: number;
  votes: number;
  riskScore: string;
  riskValue?: number;
  status: string;
  locationName?: string;
  createdAt?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [topAreas, setTopAreas] = useState<any[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);
  const nearbyRadiusKm = 3;

  const getRiskTone = (riskScore?: string) => {
    if (riskScore === "Critical" || riskScore === "High") {
      return {
        label: "Critical",
        dot: "bg-red-500",
        badge: "bg-red-500/15 text-red-200 border-red-400/30",
      };
    }

    if (riskScore === "Medium") {
      return {
        label: "Medium",
        dot: "bg-yellow-400",
        badge: "bg-yellow-400/15 text-yellow-100 border-yellow-300/30",
      };
    }

    return {
      label: "Low",
      dot: "bg-green-500",
      badge: "bg-green-500/15 text-green-200 border-green-400/30",
    };
  };

  const getApiOrigin = () => {
    const baseURL = API.defaults.baseURL || "";

    try {
      return new URL(baseURL).origin;
    } catch {
      return "";
    }
  };

  const getIssueImageSrc = (imageUrl?: string) => {
    if (!imageUrl) return "/favicon.ico";

    const apiOrigin = getApiOrigin();

    if (imageUrl.startsWith("/")) {
      return apiOrigin ? `${apiOrigin}${imageUrl}` : imageUrl;
    }

    try {
      const parsedUrl = new URL(imageUrl);

      if (
        parsedUrl.pathname.startsWith("/uploads/") &&
        apiOrigin &&
        parsedUrl.origin !== apiOrigin
      ) {
        return `${apiOrigin}${parsedUrl.pathname}`;
      }

      return imageUrl;
    } catch {
      return imageUrl;
    }
  };

  const handleIssueClick = (issue: Issue) => {
    localStorage.setItem("selectedIssue", JSON.stringify(issue));
    router.push("/driver");
  };

  const hasValidCoords = (issue: Issue) =>
    Number.isFinite(Number(issue.latitude)) &&
    Number.isFinite(Number(issue.longitude));

  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await API.get("/issues");

        const sorted = res.data.sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );

        setIssues(sorted);
      } catch (err) {
        console.error(err);
      }
    };

    fetchIssues();
  }, []);

  useEffect(() => {
    const fetchTopAreas = async () => {
      try {
        const res = await API.get("/issues/top-areas");
        const cleaned = res.data.filter(
          (a: any) => a._id && a._id !== "Unknown"
        );

        setTopAreas(cleaned);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAreas(false);
      }
    };

    fetchTopAreas();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationChecked(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationChecked(true);
      },
      () => {
        setLocationChecked(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  const total = issues.length;
  const high = issues.filter(
    (i) => i.riskScore === "Critical" || i.riskScore === "High"
  ).length;
  const resolved = issues.filter((i) => i.status === "resolved").length;
  const inProgress = issues.filter((i) => i.status === "in-progress").length;

  const today = issues.filter((i) => {
    if (!i.createdAt) return false;
    return new Date(i.createdAt).toDateString() === new Date().toDateString();
  }).length;

  const nearbyIssues = userLocation
    ? issues
        .filter(
          (issue) =>
            hasValidCoords(issue) &&
            ["pending", "in-progress"].includes(issue.status) &&
            getDistanceKm(
              userLocation.latitude,
              userLocation.longitude,
              Number(issue.latitude),
              Number(issue.longitude)
            ) <= nearbyRadiusKm
        )
        .sort(
          (a, b) =>
            getDistanceKm(
              userLocation.latitude,
              userLocation.longitude,
              Number(a.latitude),
              Number(a.longitude)
            ) -
            getDistanceKm(
              userLocation.latitude,
              userLocation.longitude,
              Number(b.latitude),
              Number(b.longitude)
            )
        )
        .slice(0, 6)
    : [];

  const topCriticalIssues = [...issues]
    .filter((issue) => issue.riskScore === "Critical" || issue.riskScore === "High")
    .sort((a, b) => {
      const riskDiff = Number(b.riskValue || 0) - Number(a.riskValue || 0);
      if (riskDiff !== 0) return riskDiff;
      return Number(b.votes || 0) - Number(a.votes || 0);
    })
    .slice(0, 3);

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-indigo-500 to-purple-500/10 p-4 md:p-6">
      <h1 className="text-xl md:text-3xl font-bold text-white mb-4 md:mb-6">
        Dashboard Overview
      </h1>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-6 space-y-6 md:space-y-8 shadow-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          <StatCard title="Today" value={today} />
          <StatCard title="Critical Risk" value={high} tone="critical" />
          <StatCard title="Resolved" value={resolved} />
          <StatCard title="In Progress" value={inProgress} />
          <StatCard title="Total" value={total} />
        </div>

        {topAreas.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm">
            Critical risk concentration in {topAreas[0]._id}
          </div>
        )}

        <div className="bg-gradient-to-r from-amber-500/15 to-red-500/10 border border-amber-400/20 rounded-2xl p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-white font-semibold text-sm md:text-lg">
                How Risk Score Works
              </h2>
              <p className="mt-1 text-xs md:text-sm text-white/70">
                CivicGuard converts civic complaints into an explainable risk score instead of only listing reports.
              </p>
            </div>
            <div className="rounded-xl bg-black/20 px-3 py-2 text-xs md:text-sm text-amber-200 border border-white/10">
              Risk Score = Severity + Frequency + Location Priority
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-white/5 p-3 border border-white/10">
              <p className="text-white text-sm font-medium">Severity</p>
              <p className="mt-1 text-xs text-white/65">
                Based on issue type like pothole, sewer, garbage, or construction.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 border border-white/10">
              <p className="text-white text-sm font-medium">Frequency</p>
              <p className="mt-1 text-xs text-white/65">
                Increased by community votes and repeated reporting confidence.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 border border-white/10">
              <p className="text-white text-sm font-medium">Location Priority</p>
              <p className="mt-1 text-xs text-white/65">
                Increased when more active civic issues exist nearby in the same area.
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs md:text-sm text-white/70">
            Weighted model: <span className="text-white font-medium">Severity × 0.5 + Frequency × 0.3 + Location Priority × 0.2</span>
          </p>
        </div>

        <div className="bg-gradient-to-r from-red-500/15 to-orange-500/10 border border-red-400/20 rounded-2xl p-4 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-white font-semibold text-sm md:text-lg">
                Top 3 Critical Issues
              </h2>
              <p className="mt-1 text-xs md:text-sm text-white/70">
                Helps authorities decide what to fix first by highlighting the most urgent civic risks.
              </p>
            </div>
            <div className="rounded-xl bg-red-500/10 px-3 py-2 text-xs md:text-sm text-red-200 border border-red-400/20">
              Prioritized using risk score + community signal
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {topCriticalIssues.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                No critical issues available right now.
              </div>
            ) : (
              topCriticalIssues.map((issue, index) => (
                <div
                  key={issue._id}
                  onClick={() => handleIssueClick(issue)}
                  className="flex cursor-pointer flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-sm font-semibold text-red-200">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium capitalize text-white md:text-base">
                          {issue.issueType}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/15 px-2 py-0.5 text-[11px] text-red-200 md:text-xs">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          {(issue.riskScore === "High" ? "Critical" : issue.riskScore)} Risk
                        </span>
                      </div>
                      <p className="text-xs text-white/70">
                        {issue.locationName && issue.locationName !== "Unknown"
                          ? issue.locationName
                          : "Location unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs md:text-sm">
                    {Number(issue.riskValue) > 0 && (
                      <span className="rounded-lg bg-black/20 px-3 py-1.5 text-white/80">
                        Risk {Math.round(Number(issue.riskValue))}
                      </span>
                    )}
                    <span className="rounded-lg bg-white/10 px-3 py-1.5 text-white/80">
                      {issue.votes} votes
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-4 md:p-6">
          <h2 className="text-white font-semibold mb-2 text-sm md:text-lg">
            Issues Distribution
          </h2>
          <Chart issues={issues} />
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
          <h2 className="text-white text-lg font-semibold mb-4">Top Areas</h2>

          {loadingAreas ? (
            <div className="text-white/60 text-sm">Loading...</div>
          ) : topAreas.length === 0 ? (
            <div className="text-white/50 text-sm">No valid location data yet</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto">
              {topAreas.map((area: any, index: number) => (
                <div
                  key={index}
                  className="min-w-[140px] px-4 py-3 rounded-xl bg-white/10 text-white text-center hover:bg-white/20 transition"
                >
                  {area._id}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/10 rounded-2xl p-4 md:p-6">
          <h2 className="text-white font-semibold mb-4 text-sm md:text-lg">
            Nearby Issues Needing Verification
          </h2>

          {!locationChecked ? (
            <div className="text-white/60 text-sm">Checking your location...</div>
          ) : !userLocation ? (
            <div className="text-white/50 text-sm">
              Enable location to see nearby issues needing verification
            </div>
          ) : nearbyIssues.length === 0 ? (
            <div className="text-white/50 text-sm">
              No nearby issues need verification right now
            </div>
          ) : (
            nearbyIssues.map((issue) => (
              <div
                key={issue._id}
                onClick={() => handleIssueClick(issue)}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-3 border-b border-white/10 cursor-pointer rounded-xl px-2 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={getIssueImageSrc(issue.imageUrl)}
                    onError={(e) => {
                      e.currentTarget.src = "/favicon.ico";
                    }}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover"
                    alt={issue.issueType}
                  />

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-white text-sm md:text-base">{issue.issueType}</p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] md:text-xs ${getRiskTone(issue.riskScore).badge}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${getRiskTone(issue.riskScore).dot}`}></span>
                        {getRiskTone(issue.riskScore).label} Risk
                      </span>
                    </div>
                    <p className="text-xs text-white/70">
                      Location: {issue.locationName && issue.locationName !== "Unknown"
                        ? issue.locationName
                        : "Location unavailable"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between md:justify-end gap-4 text-sm">
                  <span className="text-white">{issue.votes}</span>
                  <span className="text-white/80 text-xs md:text-sm">{issue.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, tone = "default" }: any) {
  const cardTone =
    tone === "critical"
      ? "bg-red-500/15 border border-red-400/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
      : "bg-white/10";

  const titleTone = tone === "critical" ? "text-red-200" : "text-white/60";
  const valueTone = tone === "critical" ? "text-red-100" : "text-white";

  return (
    <div className={`${cardTone} p-3 md:p-5 rounded-xl text-center`}>
      <p className={`${titleTone} text-xs md:text-sm`}>{title}</p>
      <h2 className={`${valueTone} text-xl md:text-3xl font-bold`}>{value}</h2>
    </div>
  );
}
