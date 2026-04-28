from pydantic import BaseModel, Field, EmailStr


class SchemeBase(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    ministry: str = Field(min_length=2, max_length=150)
    category: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    min_age: int = Field(ge=0, le=120)
    max_income: int = Field(ge=0)
    eligibility_text: str = Field(min_length=5)
    benefits: str = Field(min_length=5)
    apply_link: str = Field(min_length=5)


class SchemeCreate(SchemeBase):
    pass


class SchemeUpdate(SchemeBase):
    pass


class SchemeOut(SchemeBase):
    id: int

    model_config = {"from_attributes": True}


class EligibilityInput(BaseModel):
    age: int = Field(ge=0, le=120)
    annual_income: int = Field(ge=0)
    category: str
    state: str


class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class BookmarkPayload(BaseModel):
    scheme_id: int


class ApplicationCreate(BaseModel):
    scheme_id: int
    status: str = Field(default="interested", min_length=3, max_length=40)
    notes: str | None = None


class ApplicationOut(BaseModel):
    id: int
    scheme_id: int
    status: str
    notes: str | None

    model_config = {"from_attributes": True}
