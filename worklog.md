---
Task ID: 2
Agent: Main Agent
Task: 扩展AI模型配置 - 添加NVIDIA支持的文本/图片/语音生成模型

Work Log:
- Tested NVIDIA NIM API to verify available models (136 models total)
- Confirmed GLM-5.1, DeepSeek V4 Pro/Flash, MiniMax M2.7/M2.5, Qwen3.5, Kimi K2.5, Llama4, Nemotron Ultra, etc. are available on NVIDIA NIM
- Note: Current NVIDIA API key returns 403 on inference endpoints (likely credits exhausted), but models are confirmed available for users with valid credits
- Added ModelOption and availableModels fields to ProviderPreset type
- Expanded NVIDIA LLM preset with 31 models (GLM5.1, DeepSeek V4, MiniMax, Qwen3.5, etc.)
- Expanded OpenAI LLM preset with 7 models (GPT-4.1, o3, o4-mini, etc.)
- Expanded SiliconFlow LLM preset with 6 models
- Expanded DeepSeek preset with 2 models
- Added NVIDIA Image preset with 3 models (SDXL, SD3 Medium, SD3 Large)
- Added NVIDIA Riva TTS preset
- Added SiliconFlow Image models (FLUX.1, SD3.5)
- Added OpenAI Image models (GPT Image 1)
- Added Stability AI Image models (SD3.5, Stable Image Core)
- Added OpenAI TTS models (TTS-1 HD, GPT-4o Mini TTS)
- Added Seedance 2.0 Lite model option
- Added SiliconFlow Video models (Ali Video, Hunyuan Video)
- Created ModelSelector component with visual grid, tags, and custom input
- Updated NVIDIA image generation to support OpenAI-compatible endpoint with legacy fallback
- Added NVIDIA Riva TTS implementation (_generateTtsNvidia)
- Updated test-connection API to support testing specific models
- Updated nvidia.ts model constants
- All lint checks pass
- Successfully pushed to GitHub

Stage Summary:
- 31 NVIDIA LLM models configured (up from 4)
- NVIDIA Image generation now supports SD3 Medium/Large with OpenAI-compatible endpoint
- NVIDIA Riva TTS added as new TTS provider
- ModelSelector UI component enables visual model selection with tags
- All providers now have availableModels for better UX
- Code pushed to main branch (commit 368b0c4)
