import express from "express";
import multer from "multer";
import { simplifyText } from "../services/aiServices.js";
import { extractTextFromFile, isAllowedUpload } from "../utils/extractTextFromFile.js";
import classifyContent  from "../utils/classifyContent.js";
import generateStructure  from "../utils/generateStructure.js";

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
function isValidVisualBlock(block) {
  if (!block || !block.visualType) return false;
  if (block.visualType === 'mindmap') {
    return block.nodes &&
           block.nodes.length >= 2 &&
           block.nodes.every(n => n.children && n.children.length >= 1);
  }
  if (block.visualType === 'flow') {
    return block.nodes && block.nodes.length >= 3 &&
           block.edges && block.edges.length >= 2;
  }
  if (block.visualType === 'timeline') {
    return block.points && block.points.length >= 2;
  }
  if (block.visualType === 'comparison') {
    return block.items && block.items.length >= 2 &&
           block.items.every(i => i.points && i.points.length >= 1);
  }
  return true;
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

    const contentType = classifyContent(sourceText);
    const visualSkeleton = generateStructure(contentType, sourceText);

    let blocks = await simplifyText({ text: sourceText, language, visualSkeleton });

    const visualBlockIndex = blocks.findIndex(b => b.type === 'visual');
    if (visualBlockIndex !== -1) {
      const visualBlock = blocks[visualBlockIndex];
      if (!isValidVisualBlock(visualBlock)) {
        // retry once
        const retryBlocks = await simplifyText({ text: sourceText, language, visualSkeleton });
        const retryVisual = retryBlocks.find(b => b.type === 'visual');
        if (retryVisual && isValidVisualBlock(retryVisual)) {
          blocks[visualBlockIndex] = retryVisual;
        } else {
          // use raw skeleton
          blocks[visualBlockIndex] = visualSkeleton;
        }
      }
    }

    res.json({ blocks });
  } catch (err) {
    next(err);
  }
});

export default router;