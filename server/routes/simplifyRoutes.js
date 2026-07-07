import express from "express";
import multer from "multer";
import { simplifyText, generateCanonicalIR } from "../services/aiServices.js";
import { extractTextFromFile, isAllowedUpload } from "../utils/extractTextFromFile.js";
import classifyContent  from "../utils/classifyContent.js";
import generateStructure  from "../utils/generateStructure.js";
import transformCanonicalIR, { transformAllViews, VIEW_TYPES, transformAndValidate } from "../utils/canonicalToViewModel.js";
import recommendViewType from "../utils/recommendViewType.js";

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

router.post("/canonical", handleUpload, async (req, res, next) => {
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

    const title = req.body.title;
    const fingerprint = req.body.fingerprint;
    const requestedViewType = req.body.viewType;

    const result = await generateCanonicalIR({ text: sourceText, documentTitle: title, sourceFingerprint: fingerprint, language });

    if (!result || !result.success) {
      return res.status(400).json({
        error: result?.errorType || 'unknown_error',
        message: result?.message || 'Failed to generate Canonical IR',
        stageError: result?.stageError || null,
        details: {
          errors: result?.errors || [],
          warnings: result?.warnings || [],
          repairLog: result?.repairLog || [],
          raw: result?.raw,
          ir: result?.ir,
        },
      });
    }

    // includeAllViews flag may be passed in body or query (boolean or string 'true')
    const includeAllViews = req.body.includeAllViews === true || req.body.includeAllViews === 'true' || req.query.includeAllViews === 'true';

    return res.json(buildCanonicalResponse(result, requestedViewType, includeAllViews));
  } catch (err) {
    next(err);
  }
});

export function buildCanonicalResponse(result, requestedViewType, includeAllViews = false) {
  const recommendation = recommendViewType(result.ir);
  const recommendedView = recommendation.recommendedView;

  const normalizedRequestedViewType =
    typeof requestedViewType === 'string'
      ? requestedViewType.toLowerCase()
      : recommendedView;
  const validViewTypes = new Set(
    Object.values(VIEW_TYPES).map((viewTypeName) => viewTypeName.toLowerCase())
  );
  const viewType = validViewTypes.has(normalizedRequestedViewType)
    ? normalizedRequestedViewType
    : recommendedView;

  // Only generate all views when explicitly requested
  const allViews = includeAllViews ? transformAllViews(result.ir) : undefined;

  let viewModel = null;
  let viewValidation = null;

  if (allViews) {
    const selected = allViews[viewType];
    viewValidation = selected ?? null;
    viewModel = selected?.success ? selected.data : null;
  } else {
    // single-view transform with validation (keeps `viewModel` top-level for compatibility)
    try {
      const tv = transformAndValidate(result.ir, viewType);
      viewValidation = tv;
      viewModel = tv?.success ? tv.data : null;
    } catch (err) {
      viewValidation = null;
      viewModel = null;
    }
  }

  const successfulViews = allViews
    ? Object.entries(allViews)
        .filter(([, v]) => v.success)
        .map(([k]) => k)
    : undefined;

  const failedViews = allViews
    ? Object.entries(allViews)
        .filter(([, v]) => !v.success)
        .map(([k, v]) => ({ view: k, error: v.error }))
    : undefined;

  const rankedViews = Array.isArray(recommendation.rankedViews) && !allViews
    ? recommendation.rankedViews
    : Object.entries(recommendation.scores || {})
        .map(([viewTypeName, score]) => {
          const key = viewTypeName
          const resultView = allViews?.[key];
          const quality = resultView?.qualityScore ?? 0;
          const success = resultView?.success ?? true;
          return {
            viewTypeName: key,
            score,
            quality,
            success,
            combined: success ? score + quality : score,
          };
        })
        .sort((a, b) => {
          if (a.success !== b.success) {
            return a.success ? -1 : 1;
          }
          return b.combined - a.combined;
        })
        .map(({ viewTypeName }) => viewTypeName);

  return {
    canonical: result.ir,
    recommendedView,
    confidence: recommendation.confidence,
    rankedViews,
    scores: recommendation.scores,
    reasons: recommendation.reasons,

    viewModel,
    viewValidation,
    allViews,
    successfulViews,
    failedViews,

    errors: result.errors,
    warnings: result.warnings,
    repairLog: result.repairLog,
  };
}

export default router;