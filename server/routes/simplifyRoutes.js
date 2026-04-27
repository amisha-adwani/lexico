import express from "express";
import multer from "multer";
import { simplifyText } from "../services/aiServices.js";
import { extractTextFromFile, isAllowedUpload } from "../utils/extractTextFromFile.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (isAllowedUpload(file)) {
      return cb(null, true);
    }

    return cb(new Error("Only PDF, TXT, and DOCX files are allowed"));
  },
});

function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large. Max size is 10MB" });
      }
      return res.status(400).json({ error: err.message });
    }

    return res.status(400).json({ error: err.message || "Invalid file upload" });
  });
}

router.post("/", handleUpload, async (req, res, next) => {
  try {
    const { text, language } = req.body;
    const uploadedFile = req.file;
    let sourceText = "";

    if (uploadedFile) {
      sourceText = await extractTextFromFile(uploadedFile);
      if (!sourceText) {
        return res.status(400).json({ error: "Could not extract text from uploaded file" });
      }
    } else if (typeof text === "string" && text.trim()) {
      sourceText = text.trim();
    }

    if (!sourceText) {
      return res.status(400).json({ error: "Text or file is required" });
    }

    const blocks = await simplifyText({ text: sourceText, language });

    res.json({ blocks });
  } catch (err) {
    next(err);
  }
});

export default router;