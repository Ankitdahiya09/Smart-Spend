from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ── Database ────────────────────────────────────────────────────
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client    = AsyncIOMotorClient(mongo_url)
db        = client[os.environ.get('DB_NAME', 'smartspend')]

# ── Auth config ─────────────────────────────────────────────────
JWT_SECRET    = os.environ.get('JWT_SECRET', 'change-this-secret')
JWT_ALGORITHM = 'HS256'
JWT_HOURS     = 168   # 7 days

# ── AI config ───────────────────────────────────────────────────
# Replace with your OpenAI API key in .env  →  OPENAI_API_KEY=sk-...
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

app        = FastAPI()
api_router = APIRouter(prefix="/api")
security   = HTTPBearer()

# ════════════════════════════════════════════════════════════════
# MODELS
# ════════════════════════════════════════════════════════════════

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id         : str      = Field(default_factory=lambda: str(uuid.uuid4()))
    email      : EmailStr
    name       : str
    created_at : datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email    : EmailStr
    password : str
    name     : str

class UserLogin(BaseModel):
    email    : EmailStr
    password : str

class AuthResponse(BaseModel):
    token : str
    user  : User

class Receipt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id             : str               = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id        : str
    store_name     : str
    date           : str
    total_amount   : float
    category       : str
    image_data     : Optional[str]             = None
    extracted_data : Optional[Dict[str, Any]]  = None
    created_at     : datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReceiptUpload(BaseModel):
    image_base64 : str

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id         : str            = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id    : str
    receipt_id : Optional[str]  = None
    store_name : str
    date       : str
    amount     : float
    category   : str
    notes      : Optional[str]  = None
    created_at : datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    store_name : str
    date       : str
    amount     : float
    category   : str
    notes      : Optional[str] = None

class Budget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id         : str      = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id    : str
    category   : str
    amount     : float
    period     : str      # monthly | weekly
    created_at : datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BudgetCreate(BaseModel):
    category : str
    amount   : float
    period   : str

class ExpenseStats(BaseModel):
    total_expenses  : float
    by_category     : Dict[str, float]
    recent_expenses : List[Expense]

# ════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail='Invalid token')
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')

async def extract_receipt_data(image_base64: str) -> Dict[str, Any]:
    """Send receipt image to GPT-4o and get back structured JSON."""
    try:
        chat = LlmChat(
            api_key=OPENAI_API_KEY,           # ← your OpenAI key from .env
            session_id=str(uuid.uuid4()),
            system_message="You are a receipt data extraction expert."
        ).with_model("openai", "gpt-4o")

        prompt = """Analyze this receipt and return ONLY valid JSON (no markdown):
{
  "store_name": "string",
  "date": "YYYY-MM-DD",
  "total_amount": 0.00,
  "category": "Food | Utilities | Transportation | Entertainment | Shopping | Healthcare | Other",
  "items": ["item1", "item2"]
}"""
        response = await chat.send_message(
            UserMessage(text=prompt, file_contents=[ImageContent(image_base64=image_base64)])
        )

        clean = response.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return json.loads(clean)
    except Exception as e:
        logging.error(f"Receipt extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {e}")

# ════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ════════════════════════════════════════════════════════════════

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(data: UserCreate):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user     = User(email=data.email, name=data.name)
    user_doc = user.model_dump()
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    user_doc['password']   = hash_password(data.password)
    await db.users.insert_one(user_doc)

    return AuthResponse(token=create_token(user.id), user=user)

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(data: UserLogin):
    doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not doc or not verify_password(data.password, doc['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    doc.pop('password', None)
    if isinstance(doc['created_at'], str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'])

    user = User(**doc)
    return AuthResponse(token=create_token(user.id), user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user)):
    doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    if isinstance(doc['created_at'], str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    return User(**doc)

# ════════════════════════════════════════════════════════════════
# RECEIPT ROUTES
# ════════════════════════════════════════════════════════════════

@api_router.post("/receipts/upload", response_model=Receipt)
async def upload_receipt(
    data: ReceiptUpload, user_id: str = Depends(get_current_user)
):
    extracted = await extract_receipt_data(data.image_base64)

    receipt = Receipt(
        user_id        = user_id,
        store_name     = extracted.get('store_name', 'Unknown'),
        date           = extracted.get('date', datetime.now(timezone.utc).strftime('%Y-%m-%d')),
        total_amount   = float(extracted.get('total_amount', 0)),
        category       = extracted.get('category', 'Other'),
        image_data     = data.image_base64[:500],
        extracted_data = extracted,
    )
    doc             = receipt.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.receipts.insert_one(doc)

    # Auto-create an expense entry from the receipt
    expense = Expense(
        user_id    = user_id,
        receipt_id = receipt.id,
        store_name = receipt.store_name,
        date       = receipt.date,
        amount     = receipt.total_amount,
        category   = receipt.category,
    )
    exp_doc             = expense.model_dump()
    exp_doc['created_at'] = exp_doc['created_at'].isoformat()
    await db.expenses.insert_one(exp_doc)

    return receipt

@api_router.get("/receipts", response_model=List[Receipt])
async def get_receipts(user_id: str = Depends(get_current_user), limit: int = 50):
    docs = await db.receipts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for d in docs:
        if isinstance(d['created_at'], str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    return docs

# ════════════════════════════════════════════════════════════════
# EXPENSE ROUTES
# ════════════════════════════════════════════════════════════════

@api_router.post("/expenses", response_model=Expense)
async def create_expense(data: ExpenseCreate, user_id: str = Depends(get_current_user)):
    expense = Expense(user_id=user_id, **data.model_dump())
    doc     = expense.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.expenses.insert_one(doc)
    return expense

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(user_id: str = Depends(get_current_user), limit: int = 500):
    docs = await db.expenses.find({"user_id": user_id}, {"_id": 0}).sort("date", -1).to_list(limit)
    for d in docs:
        if isinstance(d['created_at'], str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    return docs

@api_router.get("/expenses/stats", response_model=ExpenseStats)
async def get_expense_stats(user_id: str = Depends(get_current_user)):
    docs = await db.expenses.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    for d in docs:
        if isinstance(d['created_at'], str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])

    total       = sum(d['amount'] for d in docs)
    by_category : Dict[str, float] = {}
    for d in docs:
        by_category[d['category']] = by_category.get(d['category'], 0) + d['amount']

    recent = sorted(docs, key=lambda x: x['created_at'], reverse=True)[:10]
    return ExpenseStats(
        total_expenses  = total,
        by_category     = by_category,
        recent_expenses = [Expense(**d) for d in recent],
    )

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user_id: str = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Deleted"}

# ════════════════════════════════════════════════════════════════
# BUDGET ROUTES
# ════════════════════════════════════════════════════════════════

@api_router.post("/budgets", response_model=Budget)
async def create_budget(data: BudgetCreate, user_id: str = Depends(get_current_user)):
    budget = Budget(user_id=user_id, **data.model_dump())
    doc    = budget.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.budgets.insert_one(doc)
    return budget

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(user_id: str = Depends(get_current_user)):
    docs = await db.budgets.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    for d in docs:
        if isinstance(d['created_at'], str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    return docs

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, user_id: str = Depends(get_current_user)):
    result = await db.budgets.delete_one({"id": budget_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Deleted"}

# ════════════════════════════════════════════════════════════════
# APP SETUP
# ════════════════════════════════════════════════════════════════

@api_router.get("/")
async def root():
    return {"message": "SmartSpend API running"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials = True,
    allow_origins     = os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
