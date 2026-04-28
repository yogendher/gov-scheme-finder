from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, SessionLocal
from .deps import get_db, get_current_user, require_admin
from .models import Scheme, User, Bookmark, Application
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
)
from .security import hash_password, verify_password, create_access_token

app = FastAPI(title="Government Scheme Finder API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/v1/auth/register", response_model=TokenOut)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = "admin" if db.query(User).count() == 0 else "user"
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

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


@app.get("/api/v1/schemes", response_model=list[SchemeOut])
def list_schemes(
    category: str | None = Query(default=None),
    state: str | None = Query(default=None),
    q: str | None = Query(default=None),
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

    sort_column = Scheme.name if sort_by == "name" else Scheme.id
    if order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    offset = (page - 1) * page_size
    return query.offset(offset).limit(page_size).all()


@app.get("/api/v1/schemes/{scheme_id}", response_model=SchemeOut)
def get_scheme(scheme_id: int, db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return scheme


@app.post("/api/v1/schemes", response_model=SchemeOut)
def create_scheme(
    payload: SchemeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    scheme = Scheme(**payload.model_dump())
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    return scheme


@app.put("/api/v1/schemes/{scheme_id}", response_model=SchemeOut)
def update_scheme(
    scheme_id: int,
    payload: SchemeUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    for key, value in payload.model_dump().items():
        setattr(scheme, key, value)

    db.commit()
    db.refresh(scheme)
    return scheme


@app.delete("/api/v1/schemes/{scheme_id}")
def delete_scheme(
    scheme_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    db.delete(scheme)
    db.commit()
    return {"message": "Scheme deleted"}


@app.post("/api/v1/eligibility")
def check_eligibility(payload: EligibilityInput, db: Session = Depends(get_db)):
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

        if not reasons:
            results.append({"scheme": SchemeOut.model_validate(scheme), "match": True, "reasons": ["Eligible"]})
        else:
            results.append({"scheme": SchemeOut.model_validate(scheme), "match": False, "reasons": reasons})

    return results


@app.get("/api/v1/bookmarks", response_model=list[SchemeOut])
def list_bookmarks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Scheme)
        .join(Bookmark, Bookmark.scheme_id == Scheme.id)
        .filter(Bookmark.user_id == current_user.id)
        .order_by(Scheme.id.desc())
        .all()
    )
    return rows


@app.post("/api/v1/bookmarks")
def add_bookmark(
    payload: BookmarkPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scheme = db.query(Scheme).filter(Scheme.id == payload.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.scheme_id == payload.scheme_id,
    ).first()
    if existing:
        return {"message": "Already bookmarked"}

    db.add(Bookmark(user_id=current_user.id, scheme_id=payload.scheme_id))
    db.commit()
    return {"message": "Bookmarked"}


@app.delete("/api/v1/bookmarks/{scheme_id}")
def remove_bookmark(
    scheme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.scheme_id == scheme_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(row)
    db.commit()
    return {"message": "Bookmark removed"}


@app.get("/api/v1/applications", response_model=list[ApplicationOut])
def list_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Application).filter(Application.user_id == current_user.id).order_by(Application.id.desc()).all()


@app.post("/api/v1/applications", response_model=ApplicationOut)
def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scheme = db.query(Scheme).filter(Scheme.id == payload.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    record = Application(
        user_id=current_user.id,
        scheme_id=payload.scheme_id,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.on_event("startup")
def seed_data():
    db = SessionLocal()
    try:
        if db.query(Scheme).count() > 0:
            return

        db.add_all([
            Scheme(
                name="PM Scholarship Scheme",
                ministry="Ministry of Education",
                category="Student",
                state="All India",
                min_age=17,
                max_income=800000,
                eligibility_text="Students enrolled in recognized institutions with family income below limit.",
                benefits="Annual scholarship support.",
                apply_link="https://scholarships.gov.in/",
            ),
            Scheme(
                name="PM Kisan Samman Nidhi",
                ministry="Ministry of Agriculture",
                category="Farmer",
                state="All India",
                min_age=18,
                max_income=1000000,
                eligibility_text="Small and marginal farmers with valid land records.",
                benefits="Direct income support in installments.",
                apply_link="https://pmkisan.gov.in/",
            ),
            Scheme(
                name="Stand Up India",
                ministry="Ministry of Finance",
                category="Women Startup",
                state="All India",
                min_age=18,
                max_income=1500000,
                eligibility_text="Women entrepreneurs seeking bank loans for greenfield enterprises.",
                benefits="Bank loan support and guidance.",
                apply_link="https://www.standupmitra.in/",
            ),
        ])
        db.commit()
    finally:
        db.close()
