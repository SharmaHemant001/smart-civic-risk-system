import path from "path";

export const validateUpload = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const file = req.file;

  // 1. Size check: 5MB limit
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return res.status(400).json({ error: "File exceeds 5MB size limit" });
  }

  // 2. Extension check
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return res.status(400).json({ error: `File extension ${ext} not allowed. Supported: jpg, jpeg, png, webp` });
  }

  // 3. MIME type check
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: `Mime type ${file.mimetype} is invalid` });
  }

  // 4. Magic number signature check
  const buffer = file.buffer;
  if (!buffer || buffer.length < 4) {
    return res.status(400).json({ error: "File buffer is too small or corrupt" });
  }

  const hexSignature = buffer.slice(0, 4).toString("hex").toUpperCase();
  
  // JPEG starts with FF D8 FF (usually FF D8 FF E0, FF D8 FF E1, etc.)
  const isJpeg = hexSignature.startsWith("FFD8FF");
  // PNG starts with 89 50 4E 47
  const isPng = hexSignature === "89504E47";
  // WEBP starts with RIFF (52 49 46 46) and WEBP (57 45 42 50) starting at offset 8.
  const isWebpHeader = hexSignature === "52494646"; // 'RIFF' in hex
  let isWebp = false;
  if (isWebpHeader && buffer.length >= 12) {
    const typeHeader = buffer.slice(8, 12).toString("hex").toUpperCase();
    if (typeHeader === "57454250") { // 'WEBP' in hex
      isWebp = true;
    }
  }

  if (!isJpeg && !isPng && !isWebp) {
    return res.status(400).json({ error: "Invalid file content. Magic signature check failed." });
  }

  next();
};
