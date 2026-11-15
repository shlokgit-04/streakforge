// StreakForge sync API base. Local development: same origin. Production: the Render API.
const API_BASE = location.origin.includes("localhost") || location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "https://streakforge-api-qa06.onrender.com";
