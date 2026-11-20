
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

LIVEAVATAR_API_URL = "https://api.liveavatar.com"


async def create_liveavatar_session():
    api_key = os.getenv("LIVEAVATAR_API_KEY")
    avatar_id = os.getenv("LIVEAVATAR_AVATAR_ID")
    sandbox = os.getenv("LIVEAVATAR_SANDBOX", "true").lower() == "true"

    if not api_key:
        raise ValueError("LIVEAVATAR_API_KEY is missing from backend/.env")

    if not avatar_id:
        raise ValueError("LIVEAVATAR_AVATAR_ID is missing from backend/.env")

    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "mode": "LITE",
        "avatar_id": avatar_id,
        "is_sandbox": sandbox
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{LIVEAVATAR_API_URL}/v1/sessions/token",
            headers=headers,
            json=payload
        )

    if response.is_error:
        raise RuntimeError(
            f"LiveAvatar API error ({response.status_code}): {response.text}"
        )

    result = response.json()
    data = result.get("data", {})

    session_token = data.get("session_token")
    session_id = data.get("session_id")

    if not session_token:
        raise RuntimeError("LiveAvatar did not return a session token.")

    return {
        "session_token": session_token,
        "session_id": session_id
    }
