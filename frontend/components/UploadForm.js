"use client";

import { useState } from "react";
import API from "../utils/api";

const issueOptions = [
  { key: "pothole", label: "Pothole", img: "https://cdn-icons-png.flaticon.com/512/684/684908.png" },
  { key: "garbage", label: "Garbage", img: "https://cdn-icons-png.flaticon.com/512/1046/1046857.png" },
  { key: "sewer", label: "Sewer", img: "https://cdn-icons-png.flaticon.com/512/3062/3062634.png" },
  { key: "construction", label: "Construction", img: "https://cdn-icons-png.flaticon.com/512/1995/1995574.png" },
];

export default function UploadForm() {
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [issueType, setIssueType] = useState("");
  const [location, setLocation] = useState(null);
  const [message, setMessage] = useState("");

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    });
  };

  const handleSubmit = async () => {
    try {
      if (!issueType) return setMessage("Select issue type");
      if (!imageUrl && !imageFile)
        return setMessage("Upload image or paste URL");
      if (!location) return setMessage("Get location first");

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("issueType", issueType);
        formData.append("latitude", location.latitude);
        formData.append("longitude", location.longitude);

        await API.post("/issues/upload", formData);
      } else {
        await API.post("/issues/upload", {
          imageUrl,
          issueType,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }

      setMessage("✅ Report submitted!");
      setImageUrl("");
      setImageFile(null);
      setIssueType("");
    } catch (err) {
      console.error(err);
      setMessage("❌ Submission failed");
    }
  };

  return (
    <div className="space-y-5 text-white">

      {/* 🔥 ISSUE TYPE */}
      <div>
        <p className="text-sm font-medium mb-2 text-white/80">
          Select Issue Type
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          {issueOptions.map((item) => (
            <div
              key={item.key}
              onClick={() => setIssueType(item.key)}
              className={`cursor-pointer rounded-xl p-3 text-center transition border 
              ${
                issueType === item.key
                  ? "bg-blue-500 text-white border-blue-400 scale-105 shadow-lg"
                  : "bg-white/20 border-white/30 hover:bg-white/30"
              }`}
            >
              <img src={item.img} className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs sm:text-sm">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 📸 IMAGE */}
      <div>
        <p className="text-sm font-medium mb-2 text-white/80">
          Upload Image
        </p>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/30 rounded-xl p-4 bg-white/10 cursor-pointer hover:bg-white/20 transition">
          <span className="text-xs text-white/70 mb-2">
            Tap to upload image
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="hidden"
          />
        </label>

        <p className="text-center text-xs text-white/60 my-2">OR</p>

        <input
          type="text"
          placeholder="Paste image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full p-2 rounded-lg bg-white/20 border border-white/30 
                     text-white placeholder-white/50 focus:outline-none text-sm"
        />
      </div>

      {/* 📍 LOCATION */}
      <div>
        <button
          onClick={getLocation}
          className="w-full py-2 rounded-lg text-sm md:text-base
                     bg-gradient-to-r from-blue-500 to-purple-500 
                     hover:scale-105 transition shadow-lg"
        >
          📍 Get Current Location
        </button>

        {location && (
          <p className="text-xs text-white/70 mt-2 text-center">
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </p>
        )}
      </div>

      {/* 📝 DESCRIPTION */}
      <textarea
        placeholder="Description..."
        className="w-full p-3 rounded-xl bg-white/20 border border-white/30 
                   text-white placeholder-white/50 focus:outline-none text-sm"
      />

      {/* 🚀 SUBMIT */}
      <button
        onClick={handleSubmit}
        className="w-full py-2 md:py-3 rounded-xl font-semibold text-sm md:text-base
                   bg-gradient-to-r from-blue-500 to-purple-500 
                   hover:scale-105 transition shadow-xl"
      >
        Submit Report
      </button>

      {/* 📢 MESSAGE */}
      {message && (
        <p className="text-center text-sm text-white/80">{message}</p>
      )}
    </div>
  );
}