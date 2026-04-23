from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    DATABASE_URL: str = "sqlite:///./leads.db"
    BUSINESS_NAME: str = "Our Business"
    BUSINESS_TYPE: str = "service"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
