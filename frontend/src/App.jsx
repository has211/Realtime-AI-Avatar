
import { useCallback, useRef, useState } from 'react'
import './App.css'
import Avatar from './Avatar'

const BACKEND_URL = 'http://127.0.0.1:8000'

export default function App() {
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [avatarStatus, setAvatarStatus] = useState('Disconnected')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speakRequest, setSpeakRequest] = useState(null)

  const requestIdRef = useRef(0)
  const loadingRef = useRef(false)

  const addMessage = (role, text) => {
    setMessages(previous => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random()}`,
        role,
        text,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    ])
  }

  // Called by Avatar when it recognizes your speech.
  // Typed messages also use this function, but request the avatar to speak.
  const sendMessage = useCallback(async (userText, speakReply = false) => {
    const cleanText = userText.trim()

    if (!cleanText || loadingRef.current) return null

    loadingRef.current = true
    setLoading(true)
    addMessage('user', cleanText)

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: cleanText
        })
      })

      if (!response.ok) {
        throw new Error('Could not get a response from the AI.')
      }

      const data = await response.json()

      const reply =
        data.ai_response ||
        data.response ||
        data.reply ||
        data.message ||
        'Sorry, I could not generate a response.'
        
      addMessage('assistant', reply)

      if (speakReply) {
        requestIdRef.current += 1
        setSpeakRequest({
          id: requestIdRef.current,
          text: reply
        })
      }

      return reply
    } catch (error) {
      console.error('Chat error:', error)
      addMessage(
        'assistant',
        'Sorry, something went wrong while processing your message.'
      )
      return null
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  const handleTextSubmit = async (event) => {
    event.preventDefault()

    const text = message.trim()
    if (!text || loadingRef.current) return

    setMessage('')
    await sendMessage(text, true)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">AI</div>
          <div>
            <h1>Real-Time AI Avatar</h1>
            <p>Your intelligent virtual assistant</p>
          </div>
        </div>

        <div className="connection-status">
          <span
            className={`status-dot ${
              avatarStatus === 'Connected' ? 'online' : ''
            }`}
          />
          {avatarStatus}
        </div>
      </header>

      <main className="main-layout">
        {/* LEFT PANEL: AVATAR AND VOICE CONTROLS */}
        <section className="avatar-column">
          <div className="panel-heading">
            <div>
              <h2>Virtual Assistant</h2>
              <p>Talk naturally with your AI assistant</p>
            </div>
            <span className="live-label">LIVE</span>
          </div>

          <Avatar
            onTranscript={sendMessage}
            speakRequest={speakRequest}
            onListeningChange={setIsListening}
            onSpeakingChange={setIsSpeaking}
            onStatusChange={setAvatarStatus}
          />

          <div
            className={`voice-indicator ${
              isListening ? 'listening' : ''
            } ${isSpeaking ? 'speaking' : ''}`}
          >
            <div className="waveform" aria-label="Voice activity indicator">
              {Array.from({ length: 25 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>

            <p>
              {isSpeaking
                ? 'AI is speaking...'
                : isListening
                  ? 'Listening to you...'
                  : 'Ready for conversation'}
            </p>
          </div>
        </section>

        {/* RIGHT PANEL: ONLY THE CONVERSATION */}
        <section className="chat-container">
          <div className="chat-header">
            <div>
              <h2>Conversation</h2>
              <p>Your messages and AI responses</p>
            </div>
            <div className="message-count">
              {messages.length} messages
            </div>
          </div>

          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <div className="empty-chat-icon">✦</div>
                <h3>Start a conversation</h3>
                <p>
                  Start the conversation using the microphone on the
                  left, or type a message below.
                </p>
              </div>
            ) : (
              messages.map((item) => (
                <div
                  className={`message-row ${
                    item.role === 'user' ? 'user-row' : 'assistant-row'
                  }`}
                  key={item.id}
                >
                  <div
                    className={`message-avatar ${
                      item.role === 'user' ? 'user-avatar' : 'ai-avatar'
                    }`}
                  >
                    {item.role === 'user' ? 'You' : 'AI'}
                  </div>

                  <div className="message-content">
                    <div className="message-name">
                      {item.role === 'user' ? 'You' : 'AI Assistant'}
                    </div>

                    <div className="message-bubble">
                      {item.text}
                    </div>

                    <span className="message-time">{item.time}</span>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="typing-indicator">
                <span />
                <span />
                <span />
                <small>AI is thinking...</small>
              </div>
            )}
          </div>

          {/* Text input only. There is deliberately no microphone here. */}
          <form className="text-input-area" onSubmit={handleTextSubmit}>
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your message..."
              disabled={loading}
            />

            <button
              type="submit"
              className="send-button"
              disabled={!message.trim() || loading}
            >
              Send <span>➤</span>
            </button>
          </form>
        </section>
      </main>

      <footer className="app-footer">
        Powered by Groq AI · HeyGen LiveAvatar
      </footer>
    </div>
  )
}
