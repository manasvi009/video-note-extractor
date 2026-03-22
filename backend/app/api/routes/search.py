from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.job import SearchResponse
from app.services.job_service import JobService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=list[SearchResponse])
def search(query: str = Query(min_length=2), db: Session = Depends(get_db)) -> list[SearchResponse]:
    return [SearchResponse(**item) for item in JobService(db).search(query)]

