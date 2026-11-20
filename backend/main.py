
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from io import BytesIO

from avatar_api import create_liveavatar_session
from speech_to_text import transcribe_audio
from ai_response import generate_response
from text_to_speech import text_to_speech, text_to_pcm


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="Real-Time AI Avatar API",
    description="Backend API for AI chatbot and HeyGen LiveAvatar",
    version="1.0.0"
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# REQUEST MODELS
# ==========================================

class ChatRequest(BaseModel):
    message: str


class SpeechRequest(BaseModel):
    text: str


# ==========================================
# HOME ROUTE
# ==========================================

@app.get("/")
async def home():
    return {
        "message": "Real-Time AI Avatar Backend is running!",
        "status": "success"
    }


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "Backend is running successfully"
    }


# ==========================================
# LIVEAVATAR SESSION
# ==========================================

@app.post("/api/liveavatar/session")
async def liveavatar_session():
    try:
        session_data = await create_liveavatar_session()

        return {
            "success": True,
            **session_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LiveAvatar session creation failed: {str(e)}"
        )


# ==========================================
# SPEECH TO TEXT
# ==========================================

@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    try:
        if not file.content_type or not file.content_type.startswith("audio/"):
            raise HTTPException(
                status_code=400,
                detail="Please upload a valid audio file"
            )

        audio_data = await file.read()

        if not audio_data:
            raise HTTPException(
                status_code=400,
                detail="Uploaded audio file is empty"
            )

        transcript = transcribe_audio(
            BytesIO(audio_data)
        )

        return {
            "success": True,
            "transcription": transcript
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


# ==========================================
# GROQ AI CHAT RESPONSE
# ==========================================

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        if not request.message.strip():
            raise HTTPException(
                status_code=400,
                detail="Message cannot be empty"
            )

        reply = generate_response(request.message)

        return {
            "success": True,
            "ai_response": reply
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI response generation failed: {str(e)}"
        )


# ==========================================
# TEXT TO SPEECH - MP3
# Existing browser audio playback
# ==========================================

@app.post("/api/speak")
async def speak(request: SpeechRequest):
    try:
        if not request.text.strip():
            raise HTTPException(
                status_code=400,
                detail="Text cannot be empty"
            )

        audio_buffer = text_to_speech(request.text)

        return StreamingResponse(
            audio_buffer,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3"
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Speech generation failed: {str(e)}"
        )


# ==========================================
# TEXT TO SPEECH - PCM
# HeyGen LiveAvatar lip-sync audio
# Format: 24 kHz, mono, signed 16-bit PCM
# ==========================================

@app.post("/api/speak-pcm")
async def speak_pcm(request: SpeechRequest):
    try:
        if not request.text.strip():
            raise HTTPException(
                status_code=400,
                detail="Text cannot be empty"
            )

        pcm_audio = text_to_pcm(request.text)

        return Response(
            content=pcm_audio,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": "inline; filename=speech.pcm"
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PCM audio generation failed: {str(e)}"
        )


# ==========================================
# RUN APPLICATION
# ==========================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
