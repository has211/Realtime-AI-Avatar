
import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from backend/.env
load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError(
        "GROQ_API_KEY is missing. Please check your backend/.env file."
    )

# Initialize Groq client
client = Groq(api_key=api_key)


def generate_response(user_message):

    if not user_message or not user_message.strip():
        raise ValueError("User message cannot be empty.")

    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",

            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a friendly, intelligent real-time AI avatar assistant. "
                        "Your name is AI Assistant. "
                        "Answer questions accurately and naturally. "
                        "Respond warmly and conversationally. "
                        "Keep answers clear and easy to understand. "
                        "Avoid unnecessary introductions. "
                        "Prefer 2 to 4 sentences unless the user needs more detail. "
                        "When someone asks you to introduce yourself, "
                        "briefly explain that you are their AI virtual assistant "
                        "and can answer questions and have conversations."
                    )
                },
                {
                    "role": "user",
                    "content": user_message.strip()
                }
            ],

            temperature=0.7,
            max_completion_tokens=300
        )

        answer = completion.choices[0].message.content

        if not answer:
            raise ValueError("Groq returned an empty answer.")

        return answer.strip()

    except Exception as e:
        print("Groq API error:", repr(e))
        raise
