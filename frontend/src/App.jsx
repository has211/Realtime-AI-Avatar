
import { useState, useRef, useEffect } from 'react'
import './App.css'
import Avatar from './Avatar'

function App() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }

      streamRef.current?.getTracks().forEach((track) => track.stop())

      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  // Send message to Groq AI
  const sendMessage = async (userMessage) => {
    const cleanMessage = userMessage.trim()

    if (!cleanMessage || loading) return

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: cleanMessage }
    ])

    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: cleanMessage
          })
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.detail || data.error || 'AI response failed'
        )
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.ai_response
        }
      ])

    } catch (error) {
      console.error('Chat error:', error)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, something went wrong: ' + error.message
        }
      ])

    } finally {
      setLoading(false)
    }
  }

  // Handle text message
  const handleSend = (event) => {
    event.preventDefault()

    if (!message.trim() || loading) return

    sendMessage(message)
  }

  // Convert AI response into speech using gTTS
  const handleSpeak = async (text) => {
    if (speaking) return

    setSpeaking(true)

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/speak',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text })
        }
      )

      if (!response.ok) {
        throw new Error('Could not generate speech')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      const cleanup = () => {
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
        setSpeaking(false)
      }

      audio.onended = cleanup
      audio.onerror = cleanup

      await audio.play()

    } catch (error) {
      console.error('Speech error:', error)

      alert('Unable to play audio: ' + error.message)

      setSpeaking(false)
    }
  }

  // Record microphone input
  const handleVoiceInput = async () => {
    if (isRecording || loading) return

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Microphone access is not supported by this browser.'
        )
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        })

      streamRef.current = stream

      let mimeType = ''

      if (
        MediaRecorder.isTypeSupported(
          'audio/webm;codecs=opus'
        )
      ) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (
        MediaRecorder.isTypeSupported('audio/webm')
      ) {
        mimeType = 'audio/webm'
      } else if (
        MediaRecorder.isTypeSupported('audio/mp4')
      ) {
        mimeType = 'audio/mp4'
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      recorderRef.current = recorder

      const audioChunks = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      recorder.onstop = async () => {
        setIsRecording(false)

        stream.getTracks().forEach((track) => track.stop())

        streamRef.current = null
        recorderRef.current = null

        const audioType = recorder.mimeType || 'audio/webm'

        const audioBlob = new Blob(audioChunks, {
          type: audioType
        })

        if (audioBlob.size === 0) {
          alert('No audio was recorded. Please try again.')
          return
        }

        let extension = 'webm'

        if (audioType.includes('mp4')) {
          extension = 'mp4'
        } else if (audioType.includes('ogg')) {
          extension = 'ogg'
        }

        const formData = new FormData()

        formData.append(
          'file',
          audioBlob,
          `recording.${extension}`
        )

        try {
          const response = await fetch(
            'http://127.0.0.1:8000/api/transcribe',
            {
              method: 'POST',
              body: formData
            }
          )

          const data = await response.json()

          if (!response.ok || !data.success) {
            throw new Error(
              data.detail ||
              data.error ||
              'Transcription failed'
            )
          }

          const recognizedText =
            data.transcription?.trim()

          if (!recognizedText) {
            alert('No speech detected. Please try again.')
            return
          }

          await sendMessage(recognizedText)

        } catch (error) {
          console.error('Transcription error:', error)

          alert(
            'Could not convert your voice into text: ' +
            error.message
          )
        }
      }

      recorder.start()
      setIsRecording(true)

    } catch (error) {
      console.error('Microphone error:', error)

      streamRef.current?.getTracks().forEach(
        (track) => track.stop()
      )

      streamRef.current = null

      alert(
        'Could not access microphone. Please allow microphone permission. ' +
        error.message
      )
    }
  }

  // Stop microphone recording
  const stopVoiceRecording = () => {
    if (
      recorderRef.current &&
      recorderRef.current.state === 'recording'
    ) {
      recorderRef.current.stop()
    }
  }

  return (
    <div className="app">

      {/* Header */}
      <header className="header">

        <div className="logo">
          AI
        </div>

        <div className="header-info">
          <h1>My AI Assistant</h1>
          <p>Your personal intelligent assistant</p>
        </div>

        <div className="status">
          <span></span>
          Online
        </div>

      </header>

      {/* Main Chat Container */}
      <main className="chat-container">

        {/* HeyGen LiveAvatar */}
        <Avatar />

        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="welcome">

            <div className="avatar">
              AI
            </div>

            <h2>Hello! Welcome 👋</h2>

            <p>
              I'm your AI assistant.
              Ask me anything and I'll be happy to help you!
            </p>

          </div>
        )}

        {/* Chat Messages */}
        <div className="messages">

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.role}`}
            >

              <div className="message-content">

                <p>{msg.text}</p>

                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    className="speak-button"
                    onClick={() => handleSpeak(msg.text)}
                    disabled={speaking}
                  >
                    {speaking
                      ? '🔊 Playing...'
                      : '🔊 Listen'}
                  </button>
                )}

              </div>

            </div>
          ))}

          {/* Loading Message */}
          {loading && (
            <div className="message assistant">

              <div className="message-content">
                <p>Thinking...</p>
              </div>

            </div>
          )}

        </div>

        {/* Message Input */}
        <form
          className="input-area"
          onSubmit={handleSend}
        >

          <input
            type="text"
            placeholder="Type your message here..."
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            disabled={loading}
          />

          {/* Microphone Button */}
          <button
            type="button"
            className={`mic-button ${
              isRecording ? 'recording' : ''
            }`}
            onClick={
              isRecording
                ? stopVoiceRecording
                : handleVoiceInput
            }
            disabled={loading}
          >
            {isRecording ? '⏹ Stop' : '🎤 Mic'}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            className="send-button"
            disabled={loading || !message.trim()}
          >
            {loading ? '...' : 'Send ➤'}
          </button>

        </form>

        {/* Footer */}
        <p className="footer-text">
          Powered by Groq AI, Whisper, gTTS and HeyGen
        </p>

      </main>

    </div>
  )
}

export default App
