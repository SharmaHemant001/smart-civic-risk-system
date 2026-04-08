"use client";

import { Popup } from "react-leaflet";
import API from "../utils/api";
import { useState, useEffect } from "react";

export default function MarkerPopup({ issue }) {
  if (!issue) return null;

  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState(false);
  const [validated, setValidated] = useState(false);
  const [status, setStatus] = useState(issue.status);
  const [validationVotes, setValidationVotes] = useState(
    issue.validationVotes || { yes: 0, no: 0 }
  );

  useEffect(() => {
    const votedIssues = JSON.parse(localStorage.getItem("votedIssues")) || [];
    const validatedIssues =
      JSON.parse(localStorage.getItem("validatedIssues")) || [];

    setVoted(votedIssues.includes(issue._id));
    setValidated(validatedIssues.includes(issue._id));
    setStatus(issue.status);
    setValidationVotes(issue.validationVotes || { yes: 0, no: 0 });
  }, [issue._id, issue.status, issue.validationVotes]);

  const handleUpvote = async () => {
    if (loading || voted) return;

    try {
      setLoading(true);
      await API.post(`/issues/${issue._id}/upvote`);

      const votedIssues = JSON.parse(localStorage.getItem("votedIssues")) || [];
      votedIssues.push(issue._id);
      localStorage.setItem("votedIssues", JSON.stringify(votedIssues));

      setVoted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (vote) => {
    if (loading || validated) return;

    try {
      setLoading(true);
      const res = await API.post(`/issues/${issue._id}/validate`, { vote });

      const validatedIssues =
        JSON.parse(localStorage.getItem("validatedIssues")) || [];
      validatedIssues.push(issue._id);
      localStorage.setItem(
        "validatedIssues",
        JSON.stringify(validatedIssues)
      );

      setValidationVotes(res.data?.issue?.validationVotes || { yes: 0, no: 0 });
      setStatus(res.data?.issue?.status || issue.status);
      setValidated(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popup>
      <div className="space-y-3 min-w-[220px] bg-black/80 backdrop-blur-xl text-white rounded-xl p-4 shadow-2xl border border-white/10">
        <h3 className="font-semibold text-lg capitalize">{issue.issueType}</h3>

        {issue.locationName && issue.locationName !== "Unknown" && (
          <p className="text-xs text-gray-400 uppercase tracking-[0.15em]">
            {issue.locationName}
          </p>
        )}

        {issue.description && (
          <p className="text-sm text-gray-300">
            {issue.description}
          </p>
        )}

        <p className="text-sm text-gray-300">
          Risk: <span className="font-medium">{issue.riskScore}</span>
        </p>

        <p className="text-sm text-gray-400">
          Votes: <span className="font-medium">{issue.votes}</span>
        </p>

        <span
          className={`inline-block text-xs px-2 py-1 rounded ${
            status === "resolved"
              ? "bg-green-500/20 text-green-300"
              : status === "in-progress"
              ? "bg-blue-500/20 text-blue-300"
              : status === "invalid"
              ? "bg-red-500/20 text-red-300"
              : "bg-yellow-500/20 text-yellow-300"
          }`}
        >
          {status}
        </span>

        <button
          onClick={handleUpvote}
          disabled={loading || voted}
          className={`w-full px-3 py-2 rounded-lg text-sm transition ${
            voted
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-[1.02]"
          }`}
        >
          {voted ? "Voted" : loading ? "..." : "Upvote"}
        </button>

        {status === "pending" && (
          <p className="text-yellow-400 text-xs text-center">
            Awaiting resolution
          </p>
        )}

        {status === "in-progress" && (
          <p className="text-blue-400 text-xs text-center">Issue reported</p>
        )}

        <div className="mt-2 space-y-2">
          <p className="text-xs text-gray-400 text-center">
            Is this issue resolved?
          </p>

          {!validated && status !== "invalid" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleValidation("yes")}
                disabled={loading}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
              >
                Yes
              </button>

              <button
                onClick={() => handleValidation("no")}
                disabled={loading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
              >
                No
              </button>
            </div>
          )}
        </div>

        {validated && (
          <div className="space-y-1">
            <p className="text-green-400 text-xs text-center">
              Feedback submitted
            </p>
            {status === "resolved" && (
              <p className="text-green-300 text-xs text-center">
                Community marked this issue as fixed
              </p>
            )}
          </div>
        )}
      </div>
    </Popup>
  );
}
