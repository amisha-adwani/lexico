import chunkText from "../utils/chunkText.js";
import { nowMs, successStageResult } from "./stageUtils.js";

export default async function chunkStage(context) {
  const startedAt = nowMs();
  const { chunks, sourceMap } = chunkText(context.request.text || "");
  const durationMs = nowMs() - startedAt;

  return successStageResult(
    "chunkStage",
    { chunks, sourceMap },
    durationMs,
    [],
    [],
    null,
    [
      {
        stage: "chunking",
        durationMs,
        inputSize: context.request.text,
        outputSize: chunks,
        warnings: [],
        validationResult: "ok",
      },
    ]
  );
}
