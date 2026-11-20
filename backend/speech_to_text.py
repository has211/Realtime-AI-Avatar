
from faster_whisper import WhisperModel
import tempfile
import os
import subprocess

# ==========================================
# FFmpeg configuration
# ==========================================

FFMPEG_PATH = r"C:\Users\LENOVO\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"


# ==========================================
# Load Whisper model
# ==========================================

print("Loading Whisper model...")

model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)

print("Whisper model loaded successfully!")


# ==========================================
# Speech-to-text function
# ==========================================

def transcribe_audio(audio_file):

    input_path = None
    wav_path = None

    try:

        print("\n========== AUDIO TRANSCRIPTION STARTED ==========")

        # Read uploaded audio
        audio_file.seek(0)
        audio_data = audio_file.read()

        print("Original audio size:", len(audio_data), "bytes")

        if not audio_data:
            raise ValueError("Uploaded audio is empty.")

        # Save WebM recording
        with tempfile.NamedTemporaryFile(
            suffix=".webm",
            delete=False
        ) as temp_input:

            temp_input.write(audio_data)
            input_path = temp_input.name

        print("Audio saved successfully.")

        # Create WAV file
        with tempfile.NamedTemporaryFile(
            suffix=".wav",
            delete=False
        ) as temp_output:

            wav_path = temp_output.name

        # ==========================================
        # Convert WebM to WAV
        # ==========================================

        print("Converting audio using FFmpeg...")

        result = subprocess.run(
            [
                FFMPEG_PATH,
                "-y",
                "-i", input_path,
                "-vn",
                "-ac", "1",
                "-ar", "16000",
                "-c:a", "pcm_s16le",
                wav_path
            ],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:

            print("FFmpeg conversion error:")
            print(result.stderr)

            raise RuntimeError(
                "Audio conversion failed: " + result.stderr
            )

        print("Audio converted successfully!")

        # ==========================================
        # Check WAV file
        # ==========================================

        wav_size = os.path.getsize(wav_path)

        print("Converted WAV size:", wav_size, "bytes")

        if wav_size <= 44:
            raise ValueError(
                "No usable audio data found in the recording."
            )

        # ==========================================
        # Whisper transcription
        # ==========================================

        print("Sending audio to Whisper...")

        segments, info = model.transcribe(
            wav_path,
            beam_size=5,
            language="en",
            vad_filter=True,
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
            log_prob_threshold=-1.0,
            compression_ratio_threshold=2.4
        )

        transcription_parts = []

        for segment in segments:

            text = segment.text.strip()

            print(
                f"Detected speech: {segment.start:.2f}s - "
                f"{segment.end:.2f}s : {text}"
            )

            if text:
                transcription_parts.append(text)

        transcription = " ".join(transcription_parts).strip()

        # ==========================================
        # Display results
        # ==========================================

        print("\n========== WHISPER RESULT ==========")

        print("Detected language:", info.language)

        print(
            "Language probability:",
            info.language_probability
        )

        print("Recognized text:", transcription)

        print("===================================")

        if not transcription:
            print("No speech detected. Please try again.")

        return transcription

    except Exception as error:

        print("\nTRANSCRIPTION ERROR:", str(error))

        raise

    finally:

        # Delete temporary files
        for path in [input_path, wav_path]:

            if path and os.path.exists(path):

                try:
                    os.remove(path)

                except Exception as cleanup_error:
                    print("Cleanup error:", cleanup_error)

        print("========== TRANSCRIPTION FINISHED ==========\n")
