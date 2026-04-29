from pydantic import BaseModel


class Settings(BaseModel):
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    # Любой порт на localhost / 127.0.0.1 / ::1 (Vite preview, другой dev-порт и т.д.)
    cors_origin_regex: str | None = (
        r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?"
    )


settings = Settings()