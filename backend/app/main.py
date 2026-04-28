from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, SessionLocal
from .deps import get_db, get_current_user, require_admin
from .models import Scheme, User, Bookmark, Application, UserProfile
from .schemas import (
    SchemeCreate,
    SchemeOut,
    SchemeUpdate,
    EligibilityInput,
    UserRegister,
    UserLogin,
    TokenOut,
    UserOut,
    BookmarkPayload,
    ApplicationCreate,
    ApplicationOut,
    UserProfileOut,
    UserProfileUpdate,
)
from .security import hash_password, verify_password, create_access_token

app = FastAPI(title="Government Scheme Finder API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def recommended_schemes():
    return [
        {
            "name": "PM Scholarship Scheme",
            "ministry": "Ministry of Education",
            "category": "Student",
            "state": "All India",
            "min_age": 17,
            "max_income": 800000,
            "eligibility_text": "Students in recognized institutes under income limit.",
            "benefits": "Annual scholarship assistance.",
            "apply_link": "https://scholarships.gov.in/",
        },
        {
            "name": "PM Kisan Samman Nidhi",
            "ministry": "Ministry of Agriculture",
            "category": "Farmer",
            "state": "All India",
            "min_age": 18,
            "max_income": 1000000,
            "eligibility_text": "Small and marginal farmers with land records.",
            "benefits": "Direct income support in installments.",
            "apply_link": "https://pmkisan.gov.in/",
        },
        {
            "name": "Stand Up India",
            "ministry": "Ministry of Finance",
            "category": "Women Startup",
            "state": "All India",
            "min_age": 18,
            "max_income": 1500000,
            "eligibility_text": "Women entrepreneurs for greenfield enterprises.",
            "benefits": "Loan support and mentoring.",
            "apply_link": "https://www.standupmitra.in/",
        },
        {
            "name": "Ayushman Bharat PM-JAY",
            "ministry": "Ministry of Health",
            "category": "Health",
            "state": "All India",
            "min_age": 0,
            "max_income": 500000,
            "eligibility_text": "Eligible poor and vulnerable families.",
            "benefits": "Health coverage up to defined amount.",
            "apply_link": "https://pmjay.gov.in/",
        },
        {
            "name": "MahaDBT Post Matric Scholarship",
            "ministry": "Government of Maharashtra",
            "category": "Student",
            "state": "Maharashtra",
            "min_age": 16,
            "max_income": 800000,
            "eligibility_text": "Eligible Maharashtra students in post-matric education.",
            "benefits": "Fee reimbursement and maintenance allowance.",
            "apply_link": "https://mahadbt.maharashtra.gov.in/",
        },
        {
            "name": "Kanyashree Prakalpa",
            "ministry": "Government of West Bengal",
            "category": "Women Student",
            "state": "West Bengal",
            "min_age": 13,
            "max_income": 120000,
            "eligibility_text": "Girls in education under family income criteria.",
            "benefits": "Annual and one-time financial grant.",
            "apply_link": "https://wbkanyashree.gov.in/",
        },
        {
            "name": "Rythu Bandhu",
            "ministry": "Government of Telangana",
            "category": "Farmer",
            "state": "Telangana",
            "min_age": 18,
            "max_income": 1200000,
            "eligibility_text": "Telangana farmers with eligible land ownership details.",
            "benefits": "Per-acre seasonal investment support.",
            "apply_link": "https://rythubandhu.telangana.gov.in/",
        },
        {
            "name": "Mukhyamantri Yuva Swavalamban",
            "ministry": "Government of Gujarat",
            "category": "Student",
            "state": "Gujarat",
            "min_age": 17,
            "max_income": 600000,
            "eligibility_text": "Gujarat students meeting merit and income criteria.",
            "benefits": "Scholarship for higher studies.",
            "apply_link": "https://mysy.guj.nic.in/",
        },
        {
            "name": "Biju Swasthya Kalyan Yojana",
            "ministry": "Government of Odisha",
            "category": "Health",
            "state": "Odisha",
            "min_age": 0,
            "max_income": 500000,
            "eligibility_text": "Eligible households under Odisha state health support criteria.",
            "benefits": "Cashless treatment support at empanelled hospitals.",
            "apply_link": "https://bsky.odisha.gov.in/",
        },
        {
            "name": "Naan Mudhalvan Upskilling",
            "ministry": "Government of Tamil Nadu",
            "category": "Student",
            "state": "Tamil Nadu",
            "min_age": 16,
            "max_income": 1000000,
            "eligibility_text": "Students seeking career and skill development support.",
            "benefits": "Career guidance and skill courses.",
            "apply_link": "https://www.naanmudhalvan.tn.gov.in/",
        },
    ]


def ensure_recommended_schemes(db: Session):
    created = 0
    for item in recommended_schemes():
        existing = db.query(Scheme).filter(Scheme.name == item["name"]).first()
        if not existing:
            db.add(Scheme(**item))
            created += 1
    db.commit()
    return created


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/v1/auth/register", response_model=TokenOut)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = "admin" if db.query(User).count() == 0 else "user"
    user = User(name=payload.name, email=payload.email, password_hash=hash_password(payload.password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = UserProfile(user_id=user.id, age=21, annual_income=300000, category="Student", state="All India", occupation="Student")
    db.add(profile)
    db.commit()

    token = create_access_token(user.email)
    return {"access_token": token, "user": user}


@app.post("/api/v1/auth/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.email)
    return {"access_token": token, "user": user}


@app.get("/api/v1/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/api/v1/profile", response_model=UserProfileOut)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.put("/api/v1/profile", response_model=UserProfileOut)
def update_profile(payload: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    for key, value in payload.model_dump().items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


@app.get("/api/v1/schemes", response_model=list[SchemeOut])
def list_schemes(
    category: str | None = Query(default=None),
    state: str | None = Query(default=None),
    q: str | None = Query(default=None),
    min_income: int | None = Query(default=None, ge=0),
    max_age: int | None = Query(default=None, ge=0),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    sort_by: str = Query(default="id"),
    order: str = Query(default="desc"),
    db: Session = Depends(get_db),
):
    query = db.query(Scheme)

    if category:
        query = query.filter(Scheme.category.ilike(f"%{category}%"))
    if state:
        query = query.filter(Scheme.state.ilike(f"%{state}%"))
    if q:
        query = query.filter(Scheme.name.ilike(f"%{q}%"))
    if min_income is not None:
        query = query.filter(Scheme.max_income >= min_income)
    if max_age is not None:
        query = query.filter(Scheme.min_age <= max_age)

    sort_column = Scheme.name if sort_by == "name" else Scheme.id
    query = query.order_by(sort_column.asc() if order == "asc" else sort_column.desc())

    offset = (page - 1) * page_size
    return query.offset(offset).limit(page_size).all()


@app.get("/api/v1/schemes/{scheme_id}", response_model=SchemeOut)
def get_scheme(scheme_id: int, db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return scheme


@app.post("/api/v1/schemes", response_model=SchemeOut)
def create_scheme(payload: SchemeCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    scheme = Scheme(**payload.model_dump())
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme


@app.put("/api/v1/schemes/{scheme_id}", response_model=SchemeOut)
def update_scheme(scheme_id: int, payload: SchemeUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    for key, value in payload.model_dump().items():
        setattr(scheme, key, value)
    db.commit()
    db.refresh(scheme)
    return scheme


@app.delete("/api/v1/schemes/{scheme_id}")
def delete_scheme(scheme_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    db.delete(scheme)
    db.commit()
    return {"message": "Scheme deleted"}


@app.post("/api/v1/admin/bootstrap-schemes")
def bootstrap_schemes(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    created = ensure_recommended_schemes(db)
    return {"message": "Bootstrap completed", "created": created}


def _run_eligibility(payload: EligibilityInput, db: Session):
    schemes = db.query(Scheme).all()
    results = []

    for scheme in schemes:
        reasons = []
        if payload.category.lower() not in scheme.category.lower():
            reasons.append("Category mismatch")
        if not (scheme.state.lower() == "all india" or payload.state.lower() in scheme.state.lower()):
            reasons.append("State mismatch")
        if payload.age < scheme.min_age:
            reasons.append("Age is below minimum")
        if payload.annual_income > scheme.max_income:
            reasons.append("Income exceeds limit")

        results.append({"scheme": SchemeOut.model_validate(scheme), "match": len(reasons) == 0, "reasons": ["Eligible"] if len(reasons) == 0 else reasons})

    return results


@app.post("/api/v1/eligibility")
def check_eligibility(payload: EligibilityInput, db: Session = Depends(get_db)):
    return _run_eligibility(payload, db)


@app.get("/api/v1/eligibility/from-profile")
def eligibility_from_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile or profile.age is None or profile.annual_income is None or not profile.category or not profile.state:
        raise HTTPException(status_code=400, detail="Complete profile details first")

    payload = EligibilityInput(age=profile.age, annual_income=profile.annual_income, category=profile.category, state=profile.state)
    return {
        "profile": UserProfileOut.model_validate(profile),
        "results": _run_eligibility(payload, db),
    }


@app.get("/api/v1/bookmarks", response_model=list[SchemeOut])
def list_bookmarks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Scheme)
        .join(Bookmark, Bookmark.scheme_id == Scheme.id)
        .filter(Bookmark.user_id == current_user.id)
        .order_by(Scheme.id.desc())
        .all()
    )


@app.post("/api/v1/bookmarks")
def add_bookmark(payload: BookmarkPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == payload.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    existing = db.query(Bookmark).filter(Bookmark.user_id == current_user.id, Bookmark.scheme_id == payload.scheme_id).first()
    if existing:
        return {"message": "Already bookmarked"}

    db.add(Bookmark(user_id=current_user.id, scheme_id=payload.scheme_id))
    db.commit()
    return {"message": "Bookmarked"}


@app.delete("/api/v1/bookmarks/{scheme_id}")
def remove_bookmark(scheme_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(Bookmark).filter(Bookmark.user_id == current_user.id, Bookmark.scheme_id == scheme_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(row)
    db.commit()
    return {"message": "Bookmark removed"}


@app.get("/api/v1/applications", response_model=list[ApplicationOut])
def list_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Application).filter(Application.user_id == current_user.id).order_by(Application.id.desc()).all()


@app.post("/api/v1/applications", response_model=ApplicationOut)
def create_application(payload: ApplicationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == payload.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    record = Application(user_id=current_user.id, scheme_id=payload.scheme_id, status=payload.status, notes=payload.notes)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.on_event("startup")
def seed_data():
    db = SessionLocal()
    try:
        ensure_recommended_schemes(db)
    finally:
        db.close()
