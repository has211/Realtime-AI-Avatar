
import { useEffect, useRef, useState } from 'react'
import {
  LiveAvatarSession,
  SessionEvent
} from '@heygen/liveavatar-web-sdk'

const BACKEND_URL = 'http://127.0.0.1:8000'

// Preserve the working HeyGen audio socket patch.
function patchAudioSocket(session) {
  const socket = session._sessionEventSocket

  if (!socket) {
    throw new Error('HeyGen audio socket is not available.')
  }

  if (socket.__base64AudioPatched) return

  const originalSend = socket.send.bind(socket)

  socket.send = function (data) {
    try {
      if (typeof data === 'string') {
        const parsed = JSON.parse(data)

        if (
          parsed.type === 'agent.speak' &&
          typeof parsed.audio === 'string'
        ) {
          parsed.audio = btoa(parsed.audio)
          data = JSON.stringify(parsed)
        }
      }
    } catch (error) {
      console.error('Audio socket patch error:', error)
    }

    return originalSend(data)
  }

  socket.__base64AudioPatched = true
}

function arrayBufferToBinaryString(buffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return binary
}

export default function Avatar({
  onTranscript,
  speakRequest,
  onListeningChange,
  onSpeakingChange,
  onStatusChange
}) {
  const videoRef = useRef(null)
  const sessionRef = useRef(null)
  const recognitionRef = useRef(null)

  const conversationActiveRef = useRef(false)
  const processingRef = useRef(false)
  const speakingRef = useRef(false)
  const speechTimerRef = useRef(null)
  const speechResolveRef = useRef(null)
  const lastSpeakRequestRef = useRef(null)
  const mountedRef = useRef(true)

  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [conversationActive, setConversationActive] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState('')

  const updateListening = (value) => {
    setListening(value)
    onListeningChange?.(value)
  }

  const updateSpeaking = (value) => {
    speakingRef.current = value
    setSpeaking(value)
    onSpeakingChange?.(value)
  }

  const updateStatus = (value) => {
    onStatusChange?.(value)
  }

  function waitForSpeech(duration) {
    return new Promise((resolve) => {
      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current)
      }

      speechResolveRef.current = resolve

      speechTimerRef.current = setTimeout(() => {
        speechTimerRef.current = null
        speechResolveRef.current = null
        resolve()
      }, duration)
    })
  }

  function cancelSpeechWait() {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current)
      speechTimerRef.current = null
    }

    if (speechResolveRef.current) {
      speechResolveRef.current()
      speechResolveRef.current = null
    }

    updateSpeaking(false)
  }

  // Connect to HeyGen.
  const startAvatar = async () => {
    if (sessionRef.current || connecting) return

    try {
      setError('')
      setConnecting(true)
      updateStatus('Connecting')

      const response = await fetch(
        `${BACKEND_URL}/api/liveavatar/session`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('Could not create a HeyGen session.')
      }

      const data = await response.json()

      if (!data.session_token) {
        throw new Error('Session token was not received from backend.')
      }

      const session = new LiveAvatarSession(data.session_token, {
        autoKeepAlive: true,
        voiceChat: {
          defaultMuted: true
        }
      })

      sessionRef.current = session

      session.on(SessionEvent.SESSION_STATE_CHANGED, (event) => {
        console.log('HeyGen session state:', event)
      })

      session.on(SessionEvent.SESSION_STREAM_READY, async () => {
        try {
          if (videoRef.current) {
            await session.attach(videoRef.current)
          }
        } catch (attachError) {
          console.error('Video attach error:', attachError)
          setError('Could not display the avatar video.')
        }
      })

      await session.start()

      patchAudioSocket(session)

      // Attach once more in case the stream was ready before the listener ran.
      if (videoRef.current) {
        try {
          await session.attach(videoRef.current)
        } catch (attachError) {
          console.log('Avatar video will attach when the stream is ready.')
        }
      }

      if (!mountedRef.current) return

      setConnected(true)
      updateStatus('Connected')
    } catch (err) {
      console.error('Avatar connection error:', err)
      setError(err.message || 'Unable to connect to the avatar.')
      updateStatus('Disconnected')
      sessionRef.current = null
    } finally {
      if (mountedRef.current) {
        setConnecting(false)
      }
    }
  }

  // Start browser speech recognition.
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
    } catch (err) {
      // Avoid starting recognition twice.
      console.log('Recognition start skipped:', err.message)
    }
  }

  const processRecognizedMessage = async (transcript) => {
    if (processingRef.current) return

    processingRef.current = true
    updateListening(false)

    try {
      const reply = await onTranscript?.(transcript, false)

      if (reply && conversationActiveRef.current) {
        await speakResponse(reply)
      }
    } catch (err) {
      console.error('Conversation error:', err)
      setError('There was a problem processing your message.')
    } finally {
      processingRef.current = false

      if (conversationActiveRef.current) {
        setTimeout(() => {
          startListening()
        }, 500)
      }
    }
  }

  const startConversation = () => {
    if (!connected || !sessionRef.current) {
      setError('Please start the avatar before starting the conversation.')
      return
    }

    if (conversationActiveRef.current) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError(
        'Speech recognition is not supported in this browser. Please use Google Chrome.'
      )
      return
    }

    setError('')

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognitionRef.current = recognition
    conversationActiveRef.current = true
    setConversationActive(true)

    recognition.onstart = () => {
      updateListening(true)
    }

    recognition.onresult = (event) => {
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

      if (transcript && !processingRef.current) {
        // Pause listening while Groq and the avatar respond.
        recognition.stop()
        processRecognizedMessage(transcript)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      updateListening(false)

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone permission was denied. Please allow microphone access.')
        conversationActiveRef.current = false
        setConversationActive(false)
      }
    }

    recognition.onend = () => {
      updateListening(false)

      if (
        conversationActiveRef.current &&
        !processingRef.current &&
        !speakingRef.current
      ) {
        setTimeout(() => {
          startListening()
        }, 500)
      }
    }

    startListening()
  }

  const stopConversation = () => {
    conversationActiveRef.current = false
    processingRef.current = false
    setConversationActive(false)
    updateListening(false)

    const recognition = recognitionRef.current

    if (recognition) {
      recognition.onend = null
      recognition.onresult = null

      try {
        recognition.stop()
      } catch (err) {
        console.log('Recognition already stopped.')
      }

      recognitionRef.current = null
    }

    cancelSpeechWait()
    updateStatus(connected ? 'Connected' : 'Disconnected')
  }

  // Send PCM audio to HeyGen for avatar lip-sync.
  const speakResponse = async (text) => {
    const session = sessionRef.current

    if (!session || !text) return

    try {
      updateSpeaking(true)
      updateListening(false)
      updateStatus('Speaking')

      const response = await fetch(`${BACKEND_URL}/api/speak-pcm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error('Could not generate speech audio.')
      }

      const pcmBuffer = await response.arrayBuffer()

      if (!pcmBuffer.byteLength) {
        throw new Error('The generated audio was empty.')
      }

      const binaryAudio = arrayBufferToBinaryString(pcmBuffer)

      patchAudioSocket(session)

      // 24 kHz, 16-bit, mono PCM = 48,000 bytes per second.
      const audioDuration = pcmBuffer.byteLength / 48000

      await session.repeatAudio(binaryAudio)

      await waitForSpeech(audioDuration * 1000 + 1000)
    } catch (err) {
      console.error('Avatar speech error:', err)
      setError(err.message || 'The avatar could not speak the response.')
    } finally {
      updateSpeaking(false)
      updateStatus(connected ? 'Connected' : 'Disconnected')
    }
  }

  // Speak replies to typed messages from the right-hand panel.
  useEffect(() => {
    if (!speakRequest || !speakRequest.text) return
    if (lastSpeakRequestRef.current === speakRequest.id) return

    lastSpeakRequestRef.current = speakRequest.id

    const speakTypedReply = async () => {
      processingRef.current = true

      const recognition = recognitionRef.current

      if (recognition) {
        try {
          recognition.stop()
        } catch (err) {
          console.log('Recognition already stopped.')
        }
      }

      updateListening(false)

      try {
        await speakResponse(speakRequest.text)
      } finally {
        processingRef.current = false

        if (conversationActiveRef.current) {
          setTimeout(() => {
            startListening()
          }, 500)
        }
      }
    }

    speakTypedReply()
  }, [speakRequest])

  const stopAvatar = async () => {
    stopConversation()
    cancelSpeechWait()

    const session = sessionRef.current
    sessionRef.current = null

    if (session) {
      try {
        await session.stop()
      } catch (err) {
        console.error('Error stopping avatar:', err)
      }
    }

    setConnected(false)
    setConnecting(false)
    updateStatus('Disconnected')
  }

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      conversationActiveRef.current = false

      if (recognitionRef.current) {
        recognitionRef.current.onend = null

        try {
          recognitionRef.current.stop()
        } catch (err) {
          // Recognition may already be stopped.
        }
      }

      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current)
      }

      const session = sessionRef.current
      sessionRef.current = null

      if (session) {
        session.stop().catch((err) => {
          console.error('Session cleanup error:', err)
        })
      }
    }
  }, [])

  return (
    <div className="avatar-content">
      <div className="avatar-video-container">
        <video
          ref={videoRef}
          className="avatar-video"
          autoPlay
          playsInline
        />

        {!connected && (
          <div className="avatar-placeholder">
            <div className="placeholder-avatar">AI</div>
            <h3>Your AI Avatar</h3>
            <p>Start the avatar to begin</p>
          </div>
        )}

        {connected && (
          <div className="video-live-indicator">
            <span />
            LIVE
          </div>
        )}
      </div>

      <div className="avatar-session-controls">
        {!connected ? (
          <button
            className="avatar-start-button"
            onClick={startAvatar}
            disabled={connecting}
          >
            {connecting ? 'Connecting...' : 'Start Avatar'}
          </button>
        ) : (
          <button
            className="avatar-stop-button"
            onClick={stopAvatar}
          >
            Stop Avatar
          </button>
        )}
      </div>

      <div className="conversation-controls">
        {!conversationActive ? (
          <button
            className="conversation-start-button"
            onClick={startConversation}
            disabled={!connected}
          >
            <span className="mic-symbol">🎙</span>
            Start Conversation
          </button>
        ) : (
          <button
            className="conversation-end-button"
            onClick={stopConversation}
          >
            <span className="mic-symbol">■</span>
            End Conversation
          </button>
        )}
      </div>

      <div className="avatar-status-text">
        {speaking
          ? 'Avatar is responding...'
          : listening
            ? 'Microphone is listening...'
            : conversationActive
              ? 'Preparing to listen...'
              : connected
                ? 'Avatar connected'
                : 'Avatar is disconnected'}
      </div>

      {error && (
        <div className="avatar-error">
          {error}
        </div>
      )}
    </div>
  )
}
