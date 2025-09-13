const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname)));

// --- Environment Variable Checks ---
const ARCADE_API_KEY = process.env.ARCADE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!ARCADE_API_KEY || !GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
  console.error(
    "FATAL ERROR: One or more required environment variables are missing from .env file."
  );
  console.log(
    "Please ensure ARCADE_API_KEY, GOOGLE_CLIENT_ID, and GOOGLE_API_KEY are set."
  );
  process.exit(1);
}

// --- API Endpoints ---

// Endpoint to provide the frontend with necessary, non-secret keys
app.get("/config", (req, res) => {
  res.json({
    googleClientId: GOOGLE_CLIENT_ID,
    googleApiKey: GOOGLE_API_KEY,
  });
});

// Reusable function to call the Arcade.dev API for JSON objects
async function callArcadeForJson(prompt) {
  const API_URL = "https://llm.arcade.dev/v1/chat/completions";
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ARCADE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gemini-1.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Arcade API Error Response:", errorBody);
    throw new Error(`Arcade API request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Endpoint for general chat queries (non-JSON)
app.post("/chat", async (req, res) => {
  try {
    let { prompt, complexity } = req.body;
    let systemInstruction =
      "You are Aura, an AI learning assistant. Your responses should be helpful, clear, and encouraging.";
    switch (complexity) {
      case "simplified":
        systemInstruction +=
          " Your response should be simplified, using short sentences and bullet points, suitable for a user who needs concise information.";
        break;
      case "complex":
        systemInstruction +=
          " Your response should be detailed and academic, using university-level vocabulary and providing in-depth context.";
        break;
    }

    const response = await fetch("https://llm.arcade.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ARCADE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-1.5-flash",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Arcade API Error Response:", errorBody);
      throw new Error(
        `Arcade API request failed with status ${response.status}`
      );
    }
    const data = await response.json();
    res.json({ response: data.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for analyzing documents
app.post("/analyze-documents", async (req, res) => {
  try {
    const { textContent, complexity, analysisType } = req.body;
    let systemPrompt;

    if (analysisType === "syllabus") {
      systemPrompt = `
You are an AI assistant specializing in analyzing academic documents for students.
Your task is to analyze the following syllabus text and generate a proactive study plan.
1. Provide a summary of the course. The detail level should match the user's preference: ${complexity}.
2. Extract all assignments, exams, and key deadlines.
3. For each major deadline (exam, project), create 1-2 suggested "study reminder" events scheduled 1-2 weeks prior.
4. Return the data as a single, clean JSON object. Do not include any extra text, markdown formatting, or explanations.
The JSON object must have this exact structure: { "summary": "...", "keyDates": [{ "title": "...", "dueDate": "..." }], "studyPlan": [{ "title": "...", "dueDate": "..." }] }.

Syllabus text follows:
---
${textContent}
`;
    } else if (analysisType === "studyGuide") {
      systemPrompt = `
You are an AI that creates personalized study guides from user-provided documents.
Analyze the following collection of text. Synthesize all the information and generate a learning module with three sections: Key Concepts, Topic Summary, and Potential Quiz Questions.
The detail level of each section should match the user's preference: ${complexity}.
Return the data as a single, clean JSON object. Do not include any extra text, markdown formatting, or explanations.
The JSON object must have this structure: { "concepts": "...", "summary": "...", "questions": "..." }.

Document text follows:
---
${textContent}
`;
    }
    const result = await callArcadeForJson(systemPrompt);
    res.json(JSON.parse(result));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for transcribing media (currently mocked)
app.post("/transcribe-media", async (req, res) => {
  try {
    const { fileName, complexity } = req.body;
    const prompt = `
Create a mock transcript for a file named "${fileName}".
The transcript should be timestamped.
The detail level should match the user's preference: ${complexity}.
Return the data as a single, clean JSON object. Do not include any extra text, markdown formatting, or explanations.
The JSON object must have this structure: { "transcript": "<p><b>[timestamp] SPEAKER:</b> text</p><p>...</p>" }.
`;
    const result = await callArcadeForJson(prompt);
    res.json(JSON.parse(result));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Serve the index.html file for the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start the server
app.listen(port, () => {
  console.log(
    `Server listening on port ${port}. Open http://localhost:3000 in your browser.`
  );
});
