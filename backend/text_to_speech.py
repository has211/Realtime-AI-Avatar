
from gtts import gTTS
from io import BytesIO
import subprocess


FFMPEG_PATH = r"C:\Users\LENOVO\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"


def text_to_speech(text):
    """Generate MP3 audio using Google Text-to-Speech."""
    audio_buffer = BytesIO()

    tts = gTTS(text=text, lang="en")
    tts.write_to_fp(audio_buffer)

    audio_buffer.seek(0)
    return audio_buffer


def text_to_pcm(text):
    """Convert generated MP3 audio into 24 kHz, mono, 16-bit PCM."""
    mp3_buffer = text_to_speech(text)

    result = subprocess.run(
        [
            FFMPEG_PATH,
            "-i", "pipe:0",
            "-f", "s16le",
            "-acodec", "pcm_s16le",
            "-ar", "24000",
            "-ac", "1",
            "pipe:1"
        ],
        input=mp3_buffer.getvalue(),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False
    )

    if result.returncode != 0:
        raise RuntimeError(
            result.stderr.decode("utf-8", errors="replace")
        )

    return result.stdout
