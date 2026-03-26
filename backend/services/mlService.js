import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyApqUU6HvW_H4p141rX6JNPr_VVLIIFjes");

export const detectIssue = async (imageUrl) => {
  try {
    console.log("📤 Sending to Gemini:", imageUrl);

    const model = genAI.getGenerativeModel({
       model: "gemini-2.5-flash",
    });

    const prompt = `
    Analyze this image and identify civic issue type.
    Possible categories:
    - pothole
    - garbage
    - sewer
    - construction

    Only return ONE word from above.
    Image URL: ${imageUrl}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().toLowerCase();

    console.log("🧠 Gemini Response:", text);

    // 🔥 Mapping
    if (text.includes("pothole")) return "pothole";
    if (text.includes("garbage") || text.includes("trash")) return "garbage";
    if (text.includes("sewer") || text.includes("drain")) return "sewer";

    return "construction";

  } catch (error) {
    console.error("❌ Gemini ERROR:", error.message);
    return "construction";
  }
};