from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "CombFind"
    debug: bool = True
    
    database_url: str = "postgresql://postgres:postgres@localhost:5432/combfind"
    redis_url: str = "redis://localhost:6379/0"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
