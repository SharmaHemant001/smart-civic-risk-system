export default function Legend() {
  return (
    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl z-[1000] border border-gray-200 w-40">
      
      <h4 className="font-semibold text-sm mb-3 text-gray-800">
        Risk Levels
      </h4>

      <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
        High Risk
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
        <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
        Medium Risk
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-700">
        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
        Low Risk
      </div>

    </div>
  );
}