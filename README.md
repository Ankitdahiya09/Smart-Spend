# SmartSpend — AI-Powered Expense Tracker

🔗 **Live Demo:** [https://smart-spend-livid.vercel.app/](https://smart-spend-livid.vercel.app/)

Upload a receipt photo → AI extracts the store, date, amount and category → expenses are tracked automatically.

---

## Project Structure

```
smartspend/
│
├── backend/                   ← FastAPI (Python)
│   ├── server.py              ← All API routes
│   ├── requirements.txt       ← Python packages
│   └── .env.example           ← Copy to .env and fill in your keys
│
├── frontend/                  ← React app
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js             ← Router setup
│   │   ├── index.js           ← Entry point
│   │   ├── index.css          ← Global styles + Tailwind
│   │   ├── contexts/
│   │   │   ├── AuthContext.js ← Login state
│   │   │   └── ThemeContext.js← Dark/light toggle
│   │   └── pages/
│   │       ├── Landing.js     ← Home page
│   │       ├── Login.js
│   │       ├── Signup.js
│   │       └── Dashboard.js   ← Main app (charts, receipts)
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env.example           ← Copy to .env and fill in your keys
│
├── .gitignore
└── README.md
```

---

## Where to Put YOUR API Keys

You need two API keys. Here is exactly where each one goes:

### 1 — OpenAI API Key (for receipt scanning)

**File:** `backend/.env`
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
```
Get your key at → https://platform.openai.com/api-keys
This key powers the receipt photo → structured data feature using GPT-4o Vision.

---

### 2 — MongoDB Connection String (database)

**File:** `backend/.env`
```
MONGO_URL=mongodb+srv://youruser:yourpassword@cluster.mongodb.net
DB_NAME=smartspend
```
Free MongoDB Atlas cluster → https://www.mongodb.com/cloud/atlas/register

---

### 3 — Backend URL (frontend needs to know where the API is)

**File:** `frontend/.env`
```
REACT_APP_BACKEND_URL=http://localhost:8000
```
Change this to your deployed backend URL when you go to production.

---

## Local Setup (VSCode)

### Step 1 — Clone and open in VSCode
```bash
git clone https://github.com/yourusername/smartspend.git
cd smartspend
code .
```

### Step 2 — Set up the backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Mac / Linux
venv\Scripts\activate           # Windows

# Install packages
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Now open .env in VSCode and fill in your keys (see above)

# Start the backend
uvicorn server:app --reload --port 8000
```

Backend will be running at → http://localhost:8000
You can test it at → http://localhost:8000/docs (FastAPI auto-docs)

### Step 3 — Set up the frontend

Open a second terminal in VSCode:

```bash
cd frontend

# Install packages
npm install
# or if you use yarn:
yarn install

# Create your .env file
cp .env.example .env
# REACT_APP_BACKEND_URL=http://localhost:8000  (already correct for local)

# Start the frontend
npm start
# or: yarn start
```

Frontend will open at → http://localhost:3000

---

## Deploying to GitHub

```bash
# From the root smartspend/ folder
git init
git add .
git commit -m "Initial commit"

# Create a repo on github.com, then:
git remote add origin https://github.com/yourusername/smartspend.git
git branch -M main
git push -u origin main
```

**Important:** The `.gitignore` already excludes `.env` files.
Never push your real API keys to GitHub. Use `.env.example` as the template.

---

## Deploying to Production (optional)

### Backend → Railway
1. Go to https://railway.app
2. New Project → Deploy from GitHub → select your repo
3. Set root directory to `backend`
4. Add environment variables (same as your .env) in Railway dashboard
5. Railway gives you a URL like `https://smartspend-backend.railway.app`

### Frontend → Vercel
1. Go to https://vercel.com
2. Import your GitHub repo
3. Set root directory to `frontend`
4. Add environment variable: `REACT_APP_BACKEND_URL=https://smartspend-backend.railway.app`
5. Deploy

### Database → MongoDB Atlas (free tier)
1. Create free cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user
3. Whitelist all IPs (0.0.0.0/0) for Railway/Vercel
4. Copy the connection string into `MONGO_URL`

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 19, Tailwind CSS, Recharts    |
| Backend   | FastAPI, Python                     |
| Database  | MongoDB (via Motor async driver)    |
| AI        | OpenAI GPT-4o Vision                |
| Auth      | JWT tokens, bcrypt password hashing |
| Fonts     | Outfit (headings) + Manrope (body)  |
