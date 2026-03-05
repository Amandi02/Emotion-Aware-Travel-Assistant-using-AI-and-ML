"""Backend configuration from environment."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "emotion_app"
    emotion_model_path: str = "../vit-Facial-Expression-Recognition"
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
