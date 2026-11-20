# 🤖 Real-Time AI Avatar – AI Voice Assistant

A real-time AI-powered virtual assistant that allows users to communicate naturally through voice and text. The project integrates conversational AI, speech recognition, text-to-speech conversion, audio processing, and a realistic virtual avatar to create an interactive communication experience.

The system uses **Groq AI** to generate intelligent responses and **HeyGen LiveAvatar SDK** to deliver spoken responses through a virtual avatar with synchronized lip movements.

## ✨ Features

- **Real-Time Voice Interaction:** Communicate with the AI assistant using a microphone.
- **Continuous Conversation:** Start a voice conversation and interact without manually submitting every question.
- **Automatic Listening:** The microphone automatically resumes listening after the AI avatar finishes speaking.
- **Text-Based Chat:** Send questions through the chat interface.
- **AI-Powered Responses:** Uses the Groq API with the GPT-OSS model.
- **Speech Recognition:** Captures spoken input using the browser's Web Speech API.
- **Speech-to-Text:** Supports audio transcription using Whisper through the backend.
- **Text-to-Speech:** Converts AI-generated responses into speech using gTTS.
- **AI Avatar Integration:** Uses HeyGen LiveAvatar SDK to display a virtual talking avatar.
- **Lip-Synchronized Speech:** Sends processed PCM audio to the avatar for synchronized speech.
- **Interactive Interface:** Displays the live avatar and conversation messages together on one screen.

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

The application follows a frontend-backend architecture.

1. The user interacts with the AI assistant through voice or text.
2. The React frontend captures the user's input.
3. Voice input is converted into text using browser speech recognition.
4. The frontend sends the recognized text to the FastAPI backend.
5. The backend processes the question using the Groq AI model.
6. The generated response is returned to the frontend and displayed in the conversation interface.
7. The backend converts the AI response into speech using gTTS.
8. FFmpeg processes the generated audio into 24 kHz, mono, 16-bit PCM format.
9. The frontend sends the processed audio to the HeyGen LiveAvatar session.
10. The avatar speaks the response with synchronized lip movements.
11. After speaking, the system resumes listening for the user's next question.

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

**Note:** The `.env` file contains private API credentials. It must be created locally and must not be uploaded to GitHub.

## ⚙️ Installation and Setup

### Prerequisites

Install the following software and obtain the required API credentials:

- Python 3.10 or later
- Node.js and npm
- Git
- FFmpeg
- Groq API key
- HeyGen LiveAvatar API credentials and avatar configuration

### 1. Clone the Repository

```bash
git clone https://github.com/has211/Realtime-AI-Avatar.git
```

Navigate into the project directory:

```bash
cd Realtime-AI-Avatar
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the environment on Windows:

```powershell
venv\Scripts\activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

Add your own API credentials:

```env
GROQ_API_KEY=your_groq_api_key
LIVEAVATAR_API_KEY=your_heygen_api_key
LIVEAVATAR_AVATAR_ID=your_avatar_id
LIVEAVATAR_SANDBOX=true
```

Replace the placeholder values with your actual credentials.

**Security:** Never upload your actual API keys or `.env` file to GitHub.

### 4. Configure FFmpeg

Install FFmpeg and ensure that it is accessible from your system's PATH.

The backend uses FFmpeg to convert generated speech audio into the PCM format required for avatar playback.

### 5. Start the Backend Server

From the backend directory, run:

```bash
python -m uvicorn main:app --reload --port 8000
```

The backend will run at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 6. Frontend Setup

Open a second terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local development URL displayed in the terminal, usually:

```text
http://localhost:5173
```

Allow microphone access when prompted to enable voice-based interaction.

## 🔗 Backend API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/` | GET | Backend welcome endpoint |
| `/api/health` | GET | Check backend health |
| `/api/liveavatar/session` | POST | Create a HeyGen LiveAvatar session |
| `/api/transcribe` | POST | Convert uploaded audio into text |
| `/api/chat` | POST | Generate AI responses using Groq |
| `/api/speak` | POST | Generate MP3 speech |
| `/api/speak-pcm` | POST | Generate PCM audio for avatar speech |

## 🎯 Project Objectives

- Develop an interactive AI-powered virtual assistant.
- Integrate conversational AI with a real-time virtual avatar.
- Enable both voice-based and text-based communication.
- Implement speech recognition and speech generation.
- Synchronize generated audio with avatar lip movements.
- Create a natural, continuous, and user-friendly conversational experience.

## 🚀 Future Enhancements

- Add multilingual conversation support.
- Improve response streaming and reduce response latency.
- Integrate additional AI models.
- Implement persistent conversation history.
- Add user personalization.
- Deploy the application to a cloud platform.
- Improve voice quality and conversational expression.

## 👩‍💻 Developed As

An AI-powered Real-Time Avatar project demonstrating the integration of conversational AI, speech technologies, audio processing, and real-time virtual avatar interaction.

## 📜 License

This project is developed for educational and learning purposes. A suitable open-source license can be added to define permissions for reuse and distribution.
