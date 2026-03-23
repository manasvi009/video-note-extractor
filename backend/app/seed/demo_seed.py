from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import OutputMode, Project, SourceType, User
from app.schemas.job import CreateJobRequest
from app.services.auth_service import _hash_password
from app.services.job_service import JobService


def seed_demo(db: Session) -> None:
    user = db.execute(select(User).where(User.email == "demo@videonote.app")).scalar_one_or_none()
    if not user:
        user = User(id="demo-user", email="demo@videonote.app", name="Demo User", password_hash=_hash_password("demo-password"))
        db.add(user)
        db.flush()

    project = db.execute(select(Project).where(Project.name == "Demo Workspace")).scalar_one_or_none()
    if not project:
        project = Project(id="demo-project", user_id=user.id, name="Demo Workspace", description="Seeded examples for local preview")
        db.add(project)
        db.commit()
        db.refresh(project)

    jobs = JobService(db).list_jobs(user.id)
    if jobs:
        return

    service = JobService(db)
    for title, mode in [
        ("System Design Lecture", OutputMode.lecture),
        ("Weekly Product Sync", OutputMode.meeting),
        ("Founder Podcast Episode", OutputMode.podcast),
    ]:
        job = service.create_job(
            CreateJobRequest(
                project_id=project.id,
                title=title,
                source_type=SourceType.url,
                source_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                mode=mode,
            ),
            user,
        )
        service.process_job(job.id, user.id)
