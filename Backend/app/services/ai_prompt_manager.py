import yaml
import os
from typing import Dict, Any
from pathlib import Path

class PromptManager:
    def __init__(self, config_path: str = "app/config/prompts.yaml"):
        # Resolve path relative to this file
        base_dir = Path(__file__).resolve().parents[2]
        self.config_path = base_dir / config_path
        self._prompts = self._load_prompts()

    def _load_prompts(self) -> Dict[str, Any]:
        if not self.config_path.exists():
            raise FileNotFoundError(f"Prompts config not found at {self.config_path}")
        with open(self.config_path, "r") as f:
            return yaml.safe_load(f)

    def get_prompt(self, name: str, context: Dict[str, Any]) -> Dict[str, str]:
        prompt_config = self._prompts.get(name)
        if not prompt_config:
            raise ValueError(f"Prompt '{name}' not found in configuration.")
        
        system_msg = prompt_config["system"]
        user_msg = prompt_config["user"]
        
        # Simple template replacement
        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}"
            system_msg = system_msg.replace(placeholder, str(value))
            user_msg = user_msg.replace(placeholder, str(value))
            
        return {
            "system": system_msg,
            "user": user_msg
        }
