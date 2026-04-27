export default function errorHandler(err, req, res, next) {
    console.error("Server Error:", err);
  
    if (err.name === "AbortError") {
      return res.status(408).json({ error: "Request timeout" });
    }
  
    res.status(500).json({
      error: err.message || "Internal Server Error",
    });
  }