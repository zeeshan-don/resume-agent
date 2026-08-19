# 🎓 CareerLens — Student Career & Resume Agent

An AI-powered career guidance tool that analyzes student profiles, recommends best-fit job roles, checks job fit, analyzes job descriptions, and suggests resume improvements — all using the OpenRouter API.

![CareerLens](https://img.shields.io/badge/Built_with-OpenRouter_API-6366f1?style=flat-square&logo=openrouter&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| **📄 Profile Upload** | Upload PDF/DOCX/TXT resume or paste profile text. AI extracts skills, education, projects, certifications, experience, strengths & weaknesses |
| **🎯 Career Fit** | Recommends top 5 best-fit job roles with match percentages, matching skills, and learning roadmap |
| **✅ Job Role Checker** | Enter any target role to see Strong/Moderate/Needs Improvement/Poor fit with detailed analysis |
| **📋 JD Analyzer** | Paste a job description to get match percentage, matching/missing skills, keywords, experience gaps & resume updates |
| **✨ Resume Improvement** | Get AI suggestions for headline, summary, skills, projects & experience — never invents new skills |

---

## 🛠 Tech Stack

- **Frontend:** HTML5, Internal CSS, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **AI:** OpenRouter API (Meta Llama 3.3 70B)
- **File Parsing:** pdf-parse, mammoth (DOCX)
- **Deployment:** Vercel-ready structure

---

## 📁 Project Structure

```
student-career-agent/
├── public/
│   └── index.html          # Frontend with all UI
├── server.js               # Express backend + API routes
├── package.json            # Dependencies
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

---

## ⚡ Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/your-username/student-career-agent.git
cd student-career-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:

```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

> 🔑 Get a free API key at [openrouter.ai/keys](https://openrouter.ai/keys)

### 4. Run the app

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variable: `OPENROUTER_API_KEY` = your key
4. Deploy!

Vercel will auto-detect the Node.js server and deploy it.

---

## 🔒 Security

- API key is stored in `.env` and never exposed to the frontend
- All AI calls go through the secure backend server
- File uploads are processed server-side and never stored

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Upload file or paste text to analyze profile |
| `POST` | `/api/career-fit` | Get top 5 career recommendations |
| `POST` | `/api/check-role` | Check fit for a specific job role |
| `POST` | `/api/analyze-jd` | Compare profile against a job description |
| `POST` | `/api/improve-resume` | Get resume improvement suggestions |

---

## 🧠 AI Flow

```
Upload Profile → Analyze → Find Best Roles → Check Job Fit → Compare JD → Improve Resume
```

Each step builds on the analyzed profile data stored in the browser.

---

## 📄 License

MIT — use freely for personal or commercial projects.

---

Built with ❤️ using OpenRouter API
