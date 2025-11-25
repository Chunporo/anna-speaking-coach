from fastapi import APIRouter, Depends
from app import models, schemas, auth

router = APIRouter()


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

