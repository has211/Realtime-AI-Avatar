
import { useEffect, useRef, useState } from 'react'

import {
  LiveAvatarSession,
  SessionEvent
} from '@heygen/liveavatar-web-sdk'

const BACKEND_URL = 'http://127.0.0.1:8000'

// =====================================
// PATCH HEYGEN AUDIO SOCKET
// =====================================

function patchAudioSocket(session) {
  const socket = session._sessionEventSocket

  if (!socket) {
    throw new Error(
      'HeyGen audio connection is not ready. Please reconnect the avatar.'
    )
  }

  if (socket.__base64AudioPatched) {
    return
  }

  const originalSend = socket.send.bind(socket)

  socket.send = data => {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)

        if (
          parsed.type === 'agent.speak' &&
          typeof parsed.audio === 'string'
        ) {
          parsed.audio = btoa(parsed.audio)

          return originalSend(JSON.stringify(parsed))
        }
      } catch (error) {
        console.error('Audio encoding error:', error)
      }
    }

    return originalSend(data)
  }

  socket.__base64AudioPatched = true

  console.log('HeyGen Base64 audio patch applied successfully.')
}


// =====================================
// CONVERT PCM ARRAYBUFFER TO BINARY STRING
// =====================================

function arrayBufferToBinaryString(buffer) {
  const bytes = new Uint8Array(buffer)

  const chunkSize = 0x8000
  let binaryString = ''

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)

    binaryString += String.fromCharCode(...chunk)
  }

  return binaryString
}


export default function Avatar() {
  const videoRef = useRef(null)
  const sessionRef = useRef(null)
  const recognitionRef = useRef(null)

  const conversationActiveRef = useRef(false)
  const processingRef = useRef(false)

  const speakingRef = useRef(false)
  const speechTimerRef = useRef(null)
  const speechResolveRef = useRef(null)

  const [status, setStatus] = useState('Not connected')
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)

  const [message, setMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const [conversationActive, setConversationActive] = useState(false)
  const [listening, setListening] = useState(false)

  const [error, setError] = useState('')
  const [chat, setChat] = useState([])


  // =====================================
  // WAIT FOR AVATAR SPEECH TO FINISH
  // =====================================

  const waitForSpeech = duration => {
    return new Promise(resolve => {
      speechResolveRef.current = resolve

      speechTimerRef.current = setTimeout(() => {
        speechTimerRef.current = null
        speechResolveRef.current = null
        speakingRef.current = false

        resolve()
      }, duration)
    })
  }


  // =====================================
  // CANCEL SPEECH WAIT
  // =====================================

  const cancelSpeechWait = () => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current)
      speechTimerRef.current = null
    }

    speakingRef.current = false

    if (speechResolveRef.current) {
      const resolve = speechResolveRef.current
      speechResolveRef.current = null
      resolve()
    }
  }


  // =====================================
  // START HEYGEN AVATAR
  // =====================================

  const startAvatar = async () => {
    if (loading || sessionRef.current) return

    setLoading(true)
    setError('')
    setStatus('Creating avatar session...')

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/liveavatar/session`,
        { method: 'POST' }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.detail || 'Unable to create avatar session'
        )
      }

      const session = new LiveAvatarSession(
        data.session_token,
        {
          autoKeepAlive: true,
          voiceChat: {
            defaultMuted: true
          }
        }
      )

      sessionRef.current = session

      session.on(
        SessionEvent.SESSION_STATE_CHANGED,
        state => {
          console.log('Avatar state:', state)
          setStatus(String(state))
        }
      )

      session.on(
        SessionEvent.SESSION_STREAM_READY,
        () => {
          if (videoRef.current) {
            session.attach(videoRef.current)
          }
        }
      )

      setStatus('Connecting avatar...')

      await session.start()

      // Apply the audio encoding workaround
      patchAudioSocket(session)

      setConnected(true)
      setStatus('Avatar connected')

      console.log('HeyGen avatar connected successfully.')

    } catch (err) {
      console.error('Avatar connection error:', err)

      setError(err.message)
      setStatus('Avatar connection failed')

      if (sessionRef.current) {
        try {
          await sessionRef.current.stop()
        } catch (e) {
          console.error(e)
        }

        sessionRef.current = null
      }

      setConnected(false)

    } finally {
      setLoading(false)
    }
  }


  // =====================================
  // START LISTENING AGAIN
  // =====================================

  const startListening = () => {
    const recognition = recognitionRef.current

    if (
      !recognition ||
      !conversationActiveRef.current ||
      processingRef.current ||
      speakingRef.current
    ) {
      return
    }

    try {
      recognition.start()

      setListening(true)
      setStatus('Listening... Speak now')

    } catch (err) {
      console.log('Recognition start:', err.message)
    }
  }


  // =====================================
  // CONTINUOUS SPEECH RECOGNITION
  // =====================================

  const startConversation = () => {
    setError('')

    if (!connected || !sessionRef.current) {
      setError('Please start the avatar before starting the conversation.')
      return
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError(
        'Speech recognition is not supported. Please use Google Chrome.'
      )
      return
    }

    if (conversationActiveRef.current) return

    const recognition = new SpeechRecognition()

    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognitionRef.current = recognition
    conversationActiveRef.current = true

    setConversationActive(true)
    setStatus('Starting microphone...')

    recognition.onstart = () => {
      setListening(true)
      setStatus('Listening... Speak now')
    }

    recognition.onresult = event => {
      let transcript = ''

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        }
      }

      transcript = transcript.trim()

      if (transcript) {
        console.log('Recognized speech:', transcript)

        recognition.stop()

        processMessage(transcript)
      }
    }

    recognition.onerror = event => {
      console.error('Speech recognition error:', event.error)

      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        conversationActiveRef.current = false

        setConversationActive(false)
        setListening(false)

        setError(
          'Microphone permission was denied. Please allow microphone access in Chrome.'
        )

      } else if (
        event.error !== 'no-speech' &&
        event.error !== 'aborted'
      ) {
        setError(`Microphone error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setListening(false)

      if (
        conversationActiveRef.current &&
        !processingRef.current &&
        !speakingRef.current
      ) {
        setTimeout(() => {
          startListening()
        }, 400)
      }
    }

    try {
      recognition.start()
    } catch (err) {
      console.error(err)
      setError('Unable to start microphone recognition.')
    }
  }


  // =====================================
  // END CONTINUOUS CONVERSATION
  // =====================================

  const stopConversation = () => {
    conversationActiveRef.current = false

    setConversationActive(false)
    setListening(false)

    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    cancelSpeechWait()

    setStatus('Conversation ended')
  }


  // =====================================
  // HEYGEN PCM TEXT TO SPEECH
  // =====================================

  const speakResponse = async text => {
    const session = sessionRef.current

    if (!session || !connected) {
      throw new Error(
        'Avatar is not connected. Please start the avatar first.'
      )
    }

    setStatus('Generating avatar speech...')

    // Request PCM audio from FastAPI
    const response = await fetch(
      `${BACKEND_URL}/api/speak-pcm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      }
    )

    if (!response.ok) {
      let errorMessage = 'Unable to generate PCM audio'

      try {
        const data = await response.json()
        errorMessage = data.detail || errorMessage
      } catch (e) {
        console.error(e)
      }

      throw new Error(errorMessage)
    }

    // Get raw PCM audio
    const pcmBuffer = await response.arrayBuffer()

    if (!pcmBuffer.byteLength) {
      throw new Error('Generated PCM audio is empty.')
    }

    if (pcmBuffer.byteLength % 2 !== 0) {
      throw new Error('PCM audio has an invalid byte length.')
    }

    // Convert PCM bytes to binary string
    const binaryAudio = arrayBufferToBinaryString(pcmBuffer)

    console.log('PCM audio size:', pcmBuffer.byteLength)
    console.log('PCM audio duration:', (
      pcmBuffer.byteLength / 48000
    ).toFixed(2), 'seconds')

    // Make sure socket is patched
    patchAudioSocket(session)

    setStatus('Avatar is speaking...')
    speakingRef.current = true

    try {
      // Send audio to HeyGen.
      // HeyGen receives the audio and drives avatar lip movement.
      const eventId = session.repeatAudio(binaryAudio)

      console.log('HeyGen audio event:', eventId)

      // PCM format: 24,000 samples/sec × 2 bytes/sample
      const audioDuration =
        pcmBuffer.byteLength / 48000

      // Small buffer for avatar playback completion
      await waitForSpeech(
        audioDuration * 1000 + 1000
      )

      setStatus('Avatar finished speaking')

    } catch (err) {
      cancelSpeechWait()
      throw err
    }
  }


  // =====================================
  // SEND MESSAGE TO GROQ
  // =====================================

  const processMessage = async userMessage => {
    const text = userMessage.trim()

    if (!text || processingRef.current) return

    processingRef.current = true

    setChatLoading(true)
    setError('')

    setChat(prev => [
      ...prev,
      {
        role: 'user',
        text
      }
    ])

    try {
      setStatus('Thinking...')

      const response = await fetch(
        `${BACKEND_URL}/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: text
          })
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.detail || 'AI response failed'
        )
      }

      const reply = data.ai_response?.trim()

      if (!reply) {
        throw new Error('AI returned an empty response.')
      }

      console.log('Groq response:', reply)

      // Display AI response
      setChat(prev => [
        ...prev,
        {
          role: 'assistant',
          text: reply
        }
      ])

      // Send response to HeyGen for lip-sync
      await speakResponse(reply)

    } catch (err) {
      console.error('Chat or avatar speech error:', err)

      setError(err.message)
      setStatus('Something went wrong')

    } finally {
      processingRef.current = false
      setChatLoading(false)

      // Resume microphone after avatar finishes speaking
      if (
        conversationActiveRef.current &&
        !speakingRef.current
      ) {
        setTimeout(() => {
          startListening()
        }, 500)
      }
    }
  }


  // =====================================
  // SEND TEXT MESSAGE
  // =====================================

  const sendMessage = async () => {
    if (!message.trim() || processingRef.current) return

    if (!connected) {
      setError('Please start the avatar first.')
      return
    }

    const userText = message.trim()

    setMessage('')

    await processMessage(userText)
  }


  // =====================================
  // STOP AVATAR
  // =====================================

  const stopAvatar = async () => {
    stopConversation()

    cancelSpeechWait()

    const session = sessionRef.current
    sessionRef.current = null

    if (session) {
      try {
        await session.stop()
      } catch (err) {
        console.error('Stop avatar error:', err)
      }
    }

    setConnected(false)
    setStatus('Disconnected')
  }


  // =====================================
  // CLEANUP
  // =====================================

  useEffect(() => {
    return () => {
      conversationActiveRef.current = false

      cancelSpeechWait()

      if (recognitionRef.current) {
        recognitionRef.current.onend = null
        recognitionRef.current.stop()
        recognitionRef.current = null
      }

      if (sessionRef.current) {
        sessionRef.current.stop().catch(console.error)
        sessionRef.current = null
      }
    }
  }, [])


  // =====================================
  // USER INTERFACE
  // =====================================

  return (
    <div className="avatar-panel">

      <h2>My AI Avatar</h2>

      {/* AVATAR VIDEO */}

      <div className="avatar-video-container">

        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="avatar-video"
        />

        {!connected && (
          <div className="avatar-placeholder">
            {status}
          </div>
        )}

      </div>


      {/* STATUS */}

      <p>Avatar status: {status}</p>


      {/* AVATAR CONTROLS */}

      <div className="avatar-controls">

        <button
          onClick={startAvatar}
          disabled={loading || connected}
        >
          {loading ? 'Connecting...' : 'Start Avatar'}
        </button>

        <button
          onClick={stopAvatar}
          disabled={!connected && !conversationActive}
        >
          Stop Avatar
        </button>

      </div>


      {/* CHAT */}

      <div className="avatar-chat">

        <h3>Talk to My AI</h3>

        <div className="chat-messages">

          {chat.map((item, index) => (
            <div
              key={index}
              className={`chat-message ${item.role}`}
            >
              <strong>
                {item.role === 'user' ? 'You' : 'AI'}:
              </strong>

              <p>{item.text}</p>
            </div>
          ))}

        </div>


        {/* TEXT INPUT */}

        <div className="chat-input">

          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={chatLoading}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                sendMessage()
              }
            }}
          />

          <button
            onClick={sendMessage}
            disabled={chatLoading || !message.trim()}
          >
            {chatLoading ? 'Please wait...' : 'Send'}
          </button>

        </div>


        {/* CONTINUOUS VOICE CONVERSATION */}

        <div className="avatar-controls">

          {!conversationActive ? (
            <button
              onClick={startConversation}
              disabled={chatLoading || !connected}
            >
              🎤 Start Conversation
            </button>
          ) : (
            <button
              onClick={stopConversation}
            >
              ⏹ End Conversation
            </button>
          )}

        </div>


        {conversationActive && (
          <p>
            {listening
              ? '🎤 Listening... Speak naturally.'
              : speakingRef.current
                ? '🗣️ Avatar is speaking...'
                : chatLoading
                  ? '🤖 AI is preparing your response...'
                  : '🔄 Microphone is reconnecting...'}
          </p>
        )}


        {chatLoading && (
          <p>AI is preparing your response...</p>
        )}

      </div>


      {/* ERROR */}

      {error && (
        <p className="avatar-error">
          {error}
        </p>
      )}

    </div>
  )
}
