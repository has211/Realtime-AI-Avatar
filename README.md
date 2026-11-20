# Realtime-AI-Avatar
Real-Time AI Avatar using React, FastAPI, Groq AI and HeyGen LiveAvatar SDK.
# 🤖 Real-Time AI Avatar – AI Voice Assistant

An interactive AI-powered virtual assistant that allows users to communicate naturally through voice and text. The system combines a Large Language Model (LLM), speech recognition, text-to-speech conversion, and a realistic AI avatar to create an engaging conversational experience.

The avatar listens to the user's questions, generates intelligent responses using Groq AI, and responds through both text and synchronized avatar speech using HeyGen LiveAvatar.

## ✨ Features

- **Real-Time Voice Interaction:** Communicate with the AI assistant using your microphone.
- **Text-Based Chat:** Ask questions through the chat interface.
- **AI-Powered Responses:** Uses Groq API with the GPT-OSS model to generate intelligent responses.
- **Speech-to-Text:** Converts spoken questions into text.
- **Text-to-Speech:** Converts AI-generated responses into natural speech.
- **AI Avatar Integration:** Uses HeyGen LiveAvatar SDK to display a virtual talking avatar.
- **Lip-Synchronized Speech:** Streams generated PCM audio to the avatar for synchronized speech.
- **Continuous Conversation:** Supports ongoing voice conversations without manually submitting every question.

## 🛠️ Technologies Used

| Component | Technology |
|---|---|
| Frontend | React.js, Vite |
| Backend | Python, FastAPI |
| AI Model | Groq API – GPT-OSS |
| AI Avatar | HeyGen LiveAvatar SDK |
| Speech Recognition | Browser Web Speech API |
| Speech-to-Text | Whisper |
| Text-to-Speech | Google Text-to-Speech (gTTS) |
| Audio Processing | FFmpeg |
| Communication | REST API |

## 🏗️ Project Architecture

The project follows a frontend-backend architecture.

1. The user asks a question using voice or text.
2. The frontend captures the user's input.
3. Voice input is converted into text using speech recognition.
4. The backend receives the question through FastAPI.
5. Groq AI processes the question and generates a response.
6. The generated response is displayed in the chat interface.
7. The backend converts the response into audio using gTTS.
8. FFmpeg converts the audio into 24 kHz, mono, 16-bit PCM.
9. The frontend sends the audio to the HeyGen LiveAvatar session.
10. The avatar speaks the generated response with synchronized lip movements.

## 📁 Project Structure

```text
real-time-ai-avatar/
│
├── backend/
│   ├── main.py
│   ├── ai_response.py
│   ├── avatar_api.py
│   ├── speech_to_text.py
│   ├── text_to_speech.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── Avatar.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

Note: The `.env` file is created locally and is not included in the public repository.

## ⚙️ Installation and Setup

### Prerequisites

Install the following before running the project:

- Python 3.10 or later
- Node.js and npm
- Git
- FFmpeg
- A Groq API key
- A HeyGen LiveAvatar API key and avatar configuration

### 1. Clone the Repository

```bash
git clone https://github.com/has211/Realtime-AI-Avatar.git
```

Navigate into the project:

```bash
cd Realtime-AI-Avatar
```

### 2. Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
venv\Scripts\activate
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file inside the backend folder.

Add your own API credentials:

```env
GROQ_API_KEY=your_groq_api_key
LIVEAVATAR_API_KEY=your_heygen_api_key
LIVEAVATAR_AVATAR_ID=your_avatar_id
LIVEAVATAR_SANDBOX=true
```

Never publish your actual API keys or share your `.env` file.

### 4. Configure FFmpeg

Install FFmpeg and ensure that the executable is accessible to the backend.

The FFmpeg path in the text-to-speech configuration should point to the executable on your computer.

### 5. Start the Backend Server

From the backend directory, run:

```bash
python -m uvicorn main:app --reload --port 8000
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 6. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the dependencies:

```bash
npm install
```

Start the React development server:

```bash
npm run dev
```

Open the local development URL displayed in your terminal, usually:

```text
http://localhost:5173
```

Allow microphone access when prompted to use voice interaction.

## 🔗 Backend API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/` | GET | Backend welcome endpoint |
| `/api/health` | GET | Check backend health |
| `/api/liveavatar/session` | POST | Create a LiveAvatar session |
| `/api/transcribe` | POST | Convert audio into text |
| `/api/chat` | POST | Generate AI responses |
| `/api/speak` | POST | Generate MP3 speech |
| `/api/speak-pcm` | POST | Generate PCM audio for avatar speech |

## 🎯 Project Objectives

- Develop an interactive AI-powered virtual assistant.
- Integrate conversational AI into a real-time avatar interface.
- Enable voice-based and text-based communication.
- Convert AI-generated responses into speech.
- Integrate synchronized audio playback with an AI avatar.
- Create a natural and user-friendly conversational experience.

## 🚀 Future Enhancements

- Add multilingual conversation support.
- Improve response streaming for lower latency.
- Integrate additional AI models.
- Add conversation history and user personalization.
- Deploy the application to a cloud platform.
- Improve voice quality and conversational expression.

## 👩‍💻 Developed As

An AI-powered Real-Time Avatar project demonstrating the integration of conversational AI, speech technologies, audio processing, and real-time virtual avatar interaction.

## 📜 License

This project is available for educational and learning purposes. A license can be added to define permissions for reuse and distribution.
