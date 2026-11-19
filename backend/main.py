import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

load_dotenv(Path(__file__).with_name(".env.local"))

app = FastAPI()


class AuthAccount(BaseModel):
    id: str
    email: str | None


@app.get("/")
def health_check() -> dict[str, str]:
    return {"message": "Cloudnote API is running"}


@app.get("/auth/me", response_model=AuthAccount)
async def get_auth_account(authorization: str | None = Header(default=None)) -> AuthAccount:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=401,
            detail="Sign in first to verify your account.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        raise HTTPException(503, "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{url.rstrip('/')}/auth/v1/user",
                headers={"apikey": key, "Authorization": f"Bearer {token.strip()}"},
            )
    except httpx.RequestError as error:
        raise HTTPException(502, "Could not connect to Supabase Auth.") from error

    if response.status_code in (401, 403):
        raise HTTPException(401, "Supabase rejected the session.")
    if not response.is_success:
        raise HTTPException(502, f"Supabase Auth returned status {response.status_code}.")

    try:
        return AuthAccount.model_validate(response.json())
    except ValueError as error:
        raise HTTPException(502, "Supabase Auth returned an invalid account.") from error
