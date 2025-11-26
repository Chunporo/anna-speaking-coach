from datetime import timedelta
import random
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter()


@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = auth.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Initialize streak
    streak = models.Streak(user_id=db_user.id)
    db.add(streak)
    db.commit()
    
    return db_user


@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@router.post("/google", response_model=schemas.Token)
async def google_auth(
    token_request: schemas.GoogleTokenRequest,
    db: Session = Depends(get_db)
):
    """Authenticate or register user with Google OAuth token."""
    # Verify Google token
    google_user_info = await auth.verify_google_token(token_request.token)
    
    google_id = google_user_info.get("sub")
    email = google_user_info.get("email")
    name = google_user_info.get("name", "")
    
    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google token: missing required information"
        )
    
    # Check if user exists by Google ID
    user = auth.get_user_by_google_id(db, google_id=google_id)
    
    if not user:
        # Check if user exists by email (for account linking)
        user = auth.get_user_by_email(db, email=email)
        
        if user:
            # Link Google account to existing user
            user.google_id = google_id
            db.commit()
            db.refresh(user)
        else:
            # Create new user
            # Generate username from email or name
            if email:
                username_base = email.split("@")[0]
                # Remove any non-alphanumeric characters except underscore
                username_base = "".join(c if c.isalnum() or c == "_" else "_" for c in username_base)
            else:
                username_base = name.lower().replace(" ", "_")
                # Remove any non-alphanumeric characters except underscore
                username_base = "".join(c if c.isalnum() or c == "_" else "_" for c in username_base)
            
            # Ensure username is not empty and is valid
            if not username_base or len(username_base) < 3:
                username_base = "user"
            
            # Limit username length to 50 characters (database constraint)
            username_base = username_base[:47]  # Leave room for counter suffix
            
            username = username_base
            counter = 1
            
            # Ensure unique username
            while auth.get_user_by_username(db, username):
                username = f"{username_base}{counter}"
                counter += 1
                # Prevent infinite loop (max 999 users with same base)
                if counter > 999:
                    username = f"{username_base}{random.randint(1000, 9999)}"
                    break
            
            user = models.User(
                username=username,
                email=email,
                google_id=google_id,
                password_hash=None  # OAuth users don't have password
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Initialize streak
            streak = models.Streak(user_id=user.id)
            db.add(streak)
            db.commit()
    
    # Generate JWT token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

