const express = require("express");
const path = require("path");
require("dotenv").config(); // This loads the variables from .env into process.env

const app = express();
const PORT = 3000;

// Serve the static files from the 'public' directory
app.use(express.static("public"));

// Create an endpoint for the frontend to fetch the API keys
app.get("/api/keys", (req, res) => {
  res.json({
    geminiApiKey: process.env.GEMINI_API_KEY,
    arcadeApiKey: process.env.ARCADE_API_KEY,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
