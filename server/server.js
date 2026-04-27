import "dotenv/config";
import express from "express";
import cors from "cors";

import simplifyRoute from "./routes/simplifyRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
}));

app.use(express.json({ limit: process.env.BODY_LIMIT || "2mb" }));

app.use("/api/simplify", simplifyRoute);

app.use(errorHandler);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});