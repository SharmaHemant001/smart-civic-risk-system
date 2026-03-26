export default function ReportsTable({ issues, onSelect }: any) {
  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/10 
                    p-6 rounded-2xl shadow-xl">

      {/* 🔥 HEADER */}
      <h2 className="text-white font-semibold text-lg mb-4">
        Latest Reports
      </h2>

      {/* LIST */}
      <div className="space-y-3">

        {issues.slice(0, 5).map((issue: any) => (
          <div
            key={issue._id}
            onClick={() => onSelect?.(issue)} // ✅ CLICK SUPPORT
            className="flex items-center justify-between 
                       bg-white/5 hover:bg-white/10 
                       border border-white/10 
                       rounded-xl p-3 transition cursor-pointer
                       hover:scale-[1.01] active:scale-[0.98]"
          >
            {/* LEFT */}
            <div className="flex items-center gap-3">

              {/* IMAGE */}
              <img
                src={issue.imageUrl || "/placeholder.png"}
                className="w-12 h-12 rounded-lg object-cover"
              />

              {/* TEXT */}
              <div>
                <p className="text-white capitalize font-medium">
                  {issue.issueType}
                </p>

                {/* 🔥 OPTIONAL: replace with location later */}
                <p className="text-xs text-white/60">
                  {issue.locationName || issue.issueType}
                </p>
              </div>

            </div>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-6 min-w-[140px] justify-end">

              {/* ✅ FIXED CENTER ALIGNMENT */}
              <div className="text-white font-semibold text-sm w-12 text-center">
                {issue.votes}
              </div>

              {/* STATUS */}
              <span className={`text-xs px-3 py-1 rounded-full text-center w-[100px] ${
                issue.status === "resolved"
                  ? "bg-green-500/20 text-green-300"
                  : issue.status === "invalid"
                  ? "bg-red-500/20 text-red-300"
                  : issue.status === "in-progress"
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-yellow-500/20 text-yellow-300"
              }`}>
                {issue.status || "pending"}
              </span>

            </div>
          </div>
        ))}

      </div>
    </div>
  );
}