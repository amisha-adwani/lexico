export default function cleanJSON(raw) {
    return raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
  }