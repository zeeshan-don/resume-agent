require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Multer config for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".docx", ".doc", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only PDF, DOCX, and TXT files are allowed."));
  },
});

// Helper: call OpenRouter API
async function callOpenRouter(messages, temperature = 0.4, maxTokens = 2000) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://student-career-agent.vercel.app",
      "X-Title": "Student Career Agent",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenRouter error:", err);
    throw new Error("AI request failed. Check your API key and try again.");
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Helper: parse uploaded file to text
async function extractText(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".txt") {
    return file.buffer.toString("utf-8");
  }
  if (ext === ".pdf") {
    const data = await pdfParse(file.buffer);
    return data.text;
  }
  if (ext === ".docx" || ext === ".doc") {
    const data = await mammoth.extractRawText({ buffer: file.buffer });
    return data.value;
  }
  return "";
}

// ─── API ROUTES ───

// 1. Upload & Analyze Profile
app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    let profileText = req.body.pastedText || "";

    if (req.file) {
      const fileText = await extractText(req.file);
      profileText = fileText || profileText;
    }

    if (!profileText.trim()) {
      return res.status(400).json({ error: "No profile text provided." });
    }

    const prompt = `You are an expert career counselor. Analyze this student profile/resume and return a JSON object with the following structure. Do NOT include any text outside the JSON block. Return ONLY valid JSON:

{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "education": [{"degree": "string", "institution": "string", "year": "string"}],
  "skills": ["string array of all skills mentioned"],
  "experience": [{"title": "string", "company": "string", "duration": "string", "description": "string"}],
  "projects": [{"name": "string", "description": "string", "technologies": ["string"]}],
  "certifications": ["string array"],
  "strengths": ["string array"],
  "weaknesses": ["string array - skills gaps or areas for improvement"],
  "headline": "string - current professional headline if any",
  "summary": "string - current professional summary if any"
}

Student Profile/Resume Text:
${profileText}`;

    const response = await callOpenRouter([
      { role: "user", content: prompt },
    ], 0.1, 1500);

    // Extract JSON from response
    let cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON.");

    const profile = JSON.parse(jsonMatch[0]);
    res.json({ profile });
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: err.message || "Analysis failed." });
  }
});

// 2. Career Fit Recommendations
app.post("/api/career-fit", async (req, res) => {
  try {
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ error: "Profile required." });

    const prompt = `You are a career guidance AI. Based on this student profile, recommend the TOP 5 best-fit job roles with match percentages.

Return ONLY valid JSON (no markdown, no extra text) in this exact format:
{
  "roles": [
    {
      "title": "Job Role Title",
      "matchPercentage": 85,
      "matchingSkills": ["skill1", "skill2"],
      "missingSkills": ["skill1", "skill2"],
      "whatToLearn": "Brief description of what to learn to reach this role",
      "reason": "Brief explanation of why this role fits"
    }
  ]
}

Student Profile:
${JSON.stringify(profile)}`;

    const response = await callOpenRouter([
      { role: "user", content: prompt },
    ], 0.3, 2000);

    let cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON.");

    const careerFit = JSON.parse(jsonMatch[0]);
    res.json({ careerFit });
  } catch (err) {
    console.error("Career fit error:", err);
    res.status(500).json({ error: err.message || "Career fit analysis failed." });
  }
});

// 3. Job Role Checker
app.post("/api/check-role", async (req, res) => {
  try {
    const { profile, targetRole } = req.body;
    if (!profile || !targetRole)
      return res.status(400).json({ error: "Profile and target role required." });

    const prompt = `You are an expert career counselor. Evaluate if this student is a good fit for the target job role.

Student Profile:
${JSON.stringify(profile)}

Target Role: ${targetRole}

Return ONLY valid JSON in this format:
{
  "role": "${targetRole}",
  "fitLevel": "Strong Fit" | "Moderate Fit" | "Needs Improvement" | "Poor Fit",
  "matchPercentage": 0-100,
  "matchingSkills": ["skills that match"],
  "missingSkills": ["skills needed but missing"],
  "experienceGaps": ["gaps in experience"],
  "strengths": ["strengths relevant to this role"],
  "improvements": ["what to work on"],
  "detailedAnalysis": "Detailed paragraph explaining the assessment"
}`;

    const response = await callOpenRouter([
      { role: "user", content: prompt },
    ], 0.3, 1500);

    let cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON.");

    const result = JSON.parse(jsonMatch[0]);
    res.json({ result });
  } catch (err) {
    console.error("Role check error:", err);
    res.status(500).json({ error: err.message || "Role check failed." });
  }
});

// 4. JD Analyzer
app.post("/api/analyze-jd", async (req, res) => {
  try {
    const { profile, jobDescription } = req.body;
    if (!profile || !jobDescription)
      return res.status(400).json({ error: "Profile and job description required." });

    const prompt = `You are an expert resume and job matching analyst. Compare this student's profile against the job description.

Student Profile:
${JSON.stringify(profile)}

Job Description:
${jobDescription}

Return ONLY valid JSON in this format:
{
  "matchPercentage": 0-100,
  "matchingSkills": ["skills from profile that match JD requirements"],
  "missingSkills": ["skills required in JD but not in profile"],
  "missingKeywords": ["important keywords from JD missing in profile"],
  "experienceGaps": ["gaps in experience relevant to this JD"],
  "resumeUpdates": ["specific suggestions to update resume for this JD"],
  "quickWins": ["easy things to add to improve match"],
  "detailedAnalysis": "Detailed paragraph comparing profile to JD"
}`;

    const response = await callOpenRouter([
      { role: "user", content: prompt },
    ], 0.3, 2000);

    let cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON.");

    const result = JSON.parse(jsonMatch[0]);
    res.json({ result });
  } catch (err) {
    console.error("JD analyze error:", err);
    res.status(500).json({ error: err.message || "JD analysis failed." });
  }
});

// 5. Resume Improvement
app.post("/api/improve-resume", async (req, res) => {
  try {
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ error: "Profile required." });

    const prompt = `You are an expert resume writer. Based on this student profile, suggest concrete improvements.

IMPORTANT RULES:
- Never invent new skills, experience, certifications, or achievements.
- Only suggest improvements based on what already exists in the profile.
- Focus on better presentation, wording, and structure.

Student Profile:
${JSON.stringify(profile)}

Return ONLY valid JSON in this format:
{
  "headline": {
    "current": "current headline or 'Not specified'",
    "suggested": "improved headline",
    "explanation": "why this is better"
  },
  "summary": {
    "current": "current summary or 'Not specified'",
    "suggested": "improved summary",
    "explanation": "why this is better"
  },
  "skillsSuggestions": {
    "reorder": "suggested order/grouping of existing skills",
    "missingCerts": ["certifications that would help based on existing skills"]
  },
  "projectsSuggestions": [
    {
      "project": "project name",
      "improvedDescription": "better description",
      "explanation": "what changed and why"
    }
  ],
  "experienceSuggestions": [
    {
      "role": "role title",
      "improvedDescription": "better bullet points/description",
      "explanation": "what changed and why"
    }
  ],
  "generalTips": ["general resume tips based on this profile"]
}`;

    const response = await callOpenRouter([
      { role: "user", content: prompt },
    ], 0.3, 2000);

    let cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON.");

    const result = JSON.parse(jsonMatch[0]);
    res.json({ result });
  } catch (err) {
    console.error("Improve resume error:", err);
    res.status(500).json({ error: err.message || "Resume improvement failed." });
  }
});

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Student Career Agent running at http://localhost:${PORT}`);
});
