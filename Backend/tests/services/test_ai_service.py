import pytest
from app.services.ai_service import AiService
from unittest.mock import MagicMock, patch

@pytest.mark.asyncio
async def test_ai_service_json_parsing():
    service = AiService()
    
    # Mock the openai client
    with patch.object(service.client.chat.completions, 'create') as mock_create:
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content='{"status": "ok", "value": 123}'))
        ]
        mock_create.return_value = mock_response
        
        result = await service.generate_json("system", "user")
        assert result["status"] == "ok"
        assert result["value"] == 123

@pytest.mark.asyncio
async def test_ai_service_retries():
    service = AiService()
    
    with patch.object(service.client.chat.completions, 'create') as mock_create:
        # First call fails, second succeeds
        mock_create.side_effect = [
            Exception("OpenRouter timeout"),
            MagicMock(choices=[MagicMock(message=MagicMock(content='{"retry": "success"}'))])
        ]
        
        result = await service.generate_json("system", "user")
        assert result["retry"] == "success"
        assert mock_create.call_count == 2
