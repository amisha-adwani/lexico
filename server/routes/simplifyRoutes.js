import express from "express";
import { simplifyText } from "../services/aiServices.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { text, language } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const blocks = await simplifyText({ text, language });

    res.json({ blocks });
  } catch (err) {
    next(err);
  }
});

export default router;