
export default function FilterPanel({ setFilter }) {
  return (
    <div
      className="w-full md:w-auto
                 bg-black/70 backdrop-blur-xl 
                 border border-white/10 
                 shadow-[0_10px_40px_rgba(0,0,0,0.5)]
                 rounded-2xl px-4 py-3
                 hover:scale-[1.02] transition"
    >
      <div className="flex items-center gap-2 text-white text-sm font-medium">
        <span>⚙️</span>

        <select
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-transparent text-white 
                     outline-none border-none 
                     cursor-pointer"
        >
          <option value="" className="text-black">All Issues</option>
          <option value="pothole" className="text-black">Pothole</option>
          <option value="sewer" className="text-black">Sewer</option>
          <option value="garbage" className="text-black">Garbage</option>
          <option value="construction" className="text-black">Construction</option>
        </select>
      </div>
    </div>
  );
}

