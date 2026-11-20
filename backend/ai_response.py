
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY is missing from the .env file")

client = Groq(api_key=api_key)


def generate_response(user_message):
    completion = client.chat.completions.create(
        model="openai/gpt-oss-20b",

        messages=[
            {
                "role": "system",
                "content": (
                    "You are a friendly AI avatar assistant. "
                    "Respond naturally, clearly, and warmly. "
                    "Give direct answers without unnecessary introductions. "
                    "Keep responses short, conversational, and easy to speak aloud. "
                    "Prefer 2 to 4 sentences unless more detail is necessary."
                )
            },
            {
                "role": "user",
                "content": user_message
            }
        ],

        temperature=0.7,
        max_completion_tokens=200
    )

    return completion.choices[0].message.content.strip()
