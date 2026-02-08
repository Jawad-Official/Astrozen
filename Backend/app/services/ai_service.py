import os
import json
import logging
from typing import Dict, Any, Optional
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

class AiService:
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY,
        )
        self.model = settings.MODEL_NAME

    async def generate_json(self, system_prompt: str, user_prompt: str, retries: int = 2) -> Dict[str, Any]:
        for attempt in range(retries + 1):
            try:
                # Try with response_format first
                try:
                    response = await self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        response_format={"type": "json_object"},
                        max_tokens=4000
                    )
                    content = response.choices[0].message.content
                    return json.loads(content)
                except Exception as inner_e:
                    logger.warning(f"JSON mode failed, trying text mode: {inner_e}")
                    # Fallback to standard text generation and manual parsing
                    response = await self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        max_tokens=4000
                    )
                    content = response.choices[0].message.content
                    # clean markdown code blocks
                    content = content.replace("```json", "").replace("```", "").strip()
                    return json.loads(content)

            except Exception as e:
                logger.error(f"AI Generation attempt {attempt + 1} failed: {e}")
                if attempt == retries:
                    raise e
        return {}

    async def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=4000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"AI Text Generation failed: {e}")
            raise e
