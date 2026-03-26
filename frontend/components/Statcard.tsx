
export default function StatCard({ title, value, color }: any) {
  const styles: any = {
    blue: {
      text: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    red: {
      text: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    green: {
      text: "text-green-500",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    purple: {
      text: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
  };

  return (
    <div
      className={`
        p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300
        ${styles[color]?.bg || "bg-white"} 
        ${styles[color]?.border || "border-gray-100"}
      `}
    >
      {/* Title */}
      <p className="text-sm text-gray-500 font-medium">
        {title}
      </p>

      {/* Value */}
      <h2
        className={`
          text-3xl font-bold mt-2 tracking-tight
          ${styles[color]?.text || "text-gray-800"}
        `}
      >
        {value}
      </h2>

      {/* subtle bottom accent line */}
      <div
        className={`mt-4 h-1 w-10 rounded-full ${
          styles[color]?.text.replace("text", "bg") || "bg-gray-300"
        }`}
      />
    </div>
  );
}
