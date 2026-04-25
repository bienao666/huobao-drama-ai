// ============================================================
// AI Service Configuration
// Centralizes NVIDIA API client access and provides fallback
// to z-ai-web-dev-sdk for image generation.
// ============================================================

import {
  nvidiaChatCompletion,
  nvidiaChat,
  nvidiaChatJson,
  nvidiaGenerateImage,
  withRetry,
  NVIDIA_CHAT_MODELS,
  NVIDIA_IMAGE_MODELS,
  type ChatMessage,
  type ChatCompletionOptions,
  type ChatCompletionResponse,
  type ImageGenerationOptions,
  type RetryOptions,
  type NvidiaApiError,
} from './nvidia'

// Re-export everything from nvidia for convenience
export type {
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ImageGenerationOptions,
  ImageGenerationResponse,
  RetryOptions,
  NvidiaApiError,
} from './nvidia'

export {
  NVIDIA_CHAT_MODELS,
  NVIDIA_IMAGE_MODELS,
  nvidiaChatCompletion,
  nvidiaChat,
  nvidiaChatJson,
  nvidiaGenerateImage,
  withRetry,
  parseJsonFromLlmResponse,
} from './nvidia'

// ============================================================
// z-ai-web-dev-sdk image generation fallback
// ============================================================

/**
 * Generate an image using z-ai-web-dev-sdk as a fallback provider.
 * This is used when NVIDIA image generation is unavailable or
 * when a different style/model is needed.
 */
async function generateImageWithFallback(
  prompt: string,
  size: '1024x1024' | '512x512' | '256x256' = '1024x1024'
): Promise<string> {
  // Dynamic import to keep z-ai-web-dev-sdk server-side only
  const { imageGeneration } = await import('z-ai-web-dev-sdk')

  const [width, height] = size.split('x').map(Number)

  const result = await imageGeneration({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: `${width}x${height}`,
    response_format: 'b64_json',
  })

  const imageData = result?.data?.[0]
  if (!imageData?.b64_json) {
    throw new Error('z-ai-web-dev-sdk image generation returned no data')
  }

  return imageData.b64_json
}

// ============================================================
// AI Configuration
// ============================================================

export type ImageProvider = 'nvidia' | 'z-ai-sdk'

export interface AiConfig {
  /** Whether NVIDIA API is configured (has API key) */
  readonly nvidiaAvailable: boolean
  /** Preferred provider for image generation */
  readonly imageProvider: ImageProvider
  /** Default chat model */
  readonly defaultChatModel: string
  /** Default image generation model */
  readonly defaultImageModel: string
}

/**
 * Get the current AI configuration based on environment variables.
 */
export function getAiConfig(): AiConfig {
  const nvidiaApiKey = process.env.NVIDIA_API_KEY
  const nvidiaAvailable = !!nvidiaApiKey

  // Determine image provider preference via env var, defaulting to nvidia if key is available
  const envProvider = process.env.AI_IMAGE_PROVIDER as ImageProvider | undefined
  let imageProvider: ImageProvider

  if (envProvider === 'z-ai-sdk') {
    imageProvider = 'z-ai-sdk'
  } else if (nvidiaAvailable) {
    imageProvider = 'nvidia'
  } else {
    imageProvider = 'z-ai-sdk'
  }

  return {
    nvidiaAvailable,
    imageProvider,
    defaultChatModel: NVIDIA_CHAT_MODELS.LLAMA_70B,
    defaultImageModel: NVIDIA_IMAGE_MODELS.SDXL,
  }
}

// ============================================================
// Unified AI Client
// ============================================================

/**
 * High-level AI client that provides a unified interface for both
 * NVIDIA and z-ai-sdk backends.
 */
export const aiClient = {
  // ---- Chat ----

  /**
   * Send a chat completion request (NVIDIA only).
   * Falls back gracefully if NVIDIA is unavailable.
   */
  async chatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions & RetryOptions
  ): Promise<ChatCompletionResponse> {
    const config = getAiConfig()
    if (!config.nvidiaAvailable) {
      throw new Error(
        'NVIDIA API is not configured. Set NVIDIA_API_KEY environment variable.'
      )
    }

    const { maxRetries, baseDelayMs, retryOnRateLimit, retryOnServerError, ...chatOptions } =
      options ?? {}

    return withRetry(
      () => nvidiaChatCompletion(messages, chatOptions),
      { maxRetries, baseDelayMs, retryOnRateLimit, retryOnServerError }
    )
  },

  /**
   * Simple chat: send a prompt, get text back.
   */
  async chat(
    prompt: string,
    systemPrompt?: string,
    options?: ChatCompletionOptions & RetryOptions
  ): Promise<string> {
    const config = getAiConfig()
    if (!config.nvidiaAvailable) {
      throw new Error(
        'NVIDIA API is not configured. Set NVIDIA_API_KEY environment variable.'
      )
    }

    const { maxRetries, baseDelayMs, retryOnRateLimit, retryOnServerError, ...chatOptions } =
      options ?? {}

    return withRetry(
      () => nvidiaChat(prompt, systemPrompt, chatOptions),
      { maxRetries, baseDelayMs, retryOnRateLimit, retryOnServerError }
    )
  },

  /**
   * Chat with JSON response parsing.
   * Ideal for structured extraction tasks (characters, scenes, storyboards).
   */
  async chatJson<T = unknown>(
    messages: ChatMessage[],
    options?: ChatCompletionOptions & RetryOptions
  ): Promise<T> {
    const config = getAiConfig()
    if (!config.nvidiaAvailable) {
      throw new Error(
        'NVIDIA API is not configured. Set NVIDIA_API_KEY environment variable.'
      )
    }

    const { maxRetries, baseDelayMs, retryOnRateLimit, retryOnServerError, ...chatOptions } =
      options ?? {}

    return withRetry(
      () => nvidiaChatJson<T>(messages, chatOptions),
      { maxRetries, baseDelayMs, retryOnRateLimit, retryOnServerError }
    )
  },

  // ---- Image Generation ----

  /**
   * Generate an image using the configured provider.
   * Falls back to z-ai-sdk if NVIDIA fails or is unavailable.
   *
   * @returns Base64-encoded PNG image string
   */
  async generateImage(
    prompt: string,
    negativePrompt?: string,
    options?: ImageGenerationOptions & { size?: '1024x1024' | '512x512' | '256x256' } & RetryOptions
  ): Promise<string> {
    const config = getAiConfig()
    const {
      size = '1024x1024',
      maxRetries = 2,
      baseDelayMs,
      retryOnRateLimit,
      retryOnServerError,
      ...imageOptions
    } = options ?? {}

    // Primary: Use configured provider
    if (config.imageProvider === 'nvidia' && config.nvidiaAvailable) {
      try {
        return await withRetry(
          () => nvidiaGenerateImage(prompt, negativePrompt, imageOptions),
          { maxRetries, baseDelayMs, retryOnRateLimit, retryOnServerError }
        )
      } catch (error) {
        console.warn(
          '[aiClient] NVIDIA image generation failed, falling back to z-ai-sdk:',
          error instanceof Error ? error.message : error
        )
        // Fall through to z-ai-sdk fallback
      }
    }

    // Fallback: z-ai-web-dev-sdk
    try {
      return await generateImageWithFallback(prompt, size)
    } catch (fallbackError) {
      // If both providers fail, throw a comprehensive error
      throw new Error(
        `Image generation failed on all providers. ` +
          `NVIDIA: ${config.nvidiaAvailable ? 'attempted but failed' : 'not configured'}. ` +
          `z-ai-sdk: ${fallbackError instanceof Error ? fallbackError.message : 'unknown error'}.`
      )
    }
  },

  /**
   * Generate a character portrait image.
   * Uses optimized settings for portrait-style output.
   */
  async generateCharacterPortrait(
    description: string,
    style?: string
  ): Promise<string> {
    const portraitPrompt = [
      'Cinematic character portrait, high detail, dramatic lighting,',
      style ? `${style} style,` : '',
      description,
      'professional photography, shallow depth of field, 8k quality',
    ]
      .filter(Boolean)
      .join(' ')

    const negativePrompt =
      'blurry, low quality, distorted face, extra limbs, deformed, watermark, text'

    return this.generateImage(portraitPrompt, negativePrompt, {
      width: 1024,
      height: 1024,
      cfg_scale: 8,
      steps: 50,
    })
  },

  /**
   * Generate a storyboard frame image.
   * Uses optimized settings for cinematic scene composition.
   */
  async generateStoryboardFrame(
    description: string,
    atmosphere?: string
  ): Promise<string> {
    const framePrompt = [
      'Storyboard frame, cinematic composition,',
      atmosphere ? `${atmosphere} atmosphere,` : '',
      description,
      'film still, professional cinematography, high quality',
    ]
      .filter(Boolean)
      .join(' ')

    const negativePrompt =
      'blurry, low quality, amateur, cartoon, anime, watermark, text overlay'

    return this.generateImage(framePrompt, negativePrompt, {
      width: 1344,
      height: 768,
      cfg_scale: 7,
      steps: 50,
    })
  },

  // ---- Configuration ----

  /** Get current AI configuration */
  getConfig: getAiConfig,
}

// ============================================================
// Convenience: get the NVIDIA client
// ============================================================

/**
 * Get a typed NVIDIA client object for direct API access.
 * Useful when you need fine-grained control over the NVIDIA API
 * without the abstraction layer of aiClient.
 *
 * @throws Error if NVIDIA_API_KEY is not set
 *
 * @example
 * ```ts
 * const nvidia = getNvidiaClient();
 * const result = await nvidia.chat.completion({
 *   messages: [{ role: 'user', content: 'Hello' }],
 *   model: NVIDIA_CHAT_MODELS.LLAMA_405B,
 * });
 * ```
 */
export function getNvidiaClient() {
  const config = getAiConfig()
  if (!config.nvidiaAvailable) {
    throw new Error(
      'NVIDIA API is not configured. Set NVIDIA_API_KEY environment variable.'
    )
  }

  return {
    chat: {
      completion: nvidiaChatCompletion,
      simple: nvidiaChat,
      json: nvidiaChatJson,
    },
    image: {
      generate: nvidiaGenerateImage,
    },
    models: {
      chat: NVIDIA_CHAT_MODELS,
      image: NVIDIA_IMAGE_MODELS,
    },
    retry: withRetry,
  }
}

// ============================================================
// Preset system prompts for common drama-production tasks
// ============================================================

export const AI_SYSTEM_PROMPTS = {
  /** 剧本改写/润色 */
  SCRIPT_REWRITE: `你是一位专业的短剧编剧。你的任务是将原始故事内容改写为格式化的短剧剧本。

改写规则：
1. 保留核心情节和角色关系
2. 增强画面感，将叙述性文字转化为可视化场景描写
3. 用对话驱动情节，减少旁白
4. 每场戏控制在30-60秒
5. 不写镜头语言（景别、角度等），这些属于分镜步骤

格式化剧本格式：
## S编号 | 内景/外景 · 地点 | 时间段

动作描写自然段

角色名：（状态/表情）台词内容

请直接输出改写后的剧本，不要添加其他说明。`,

  /** 角色和场景提取 */
  EXTRACT: `你是一位专业的短剧分析师。你的任务是从剧本中提取角色和场景信息。

请从剧本中提取所有角色和场景，以JSON格式返回：
{
  "characters": [
    { "name": "角色名", "role": "protagonist/antagonist/supporting/extras", "gender": "male/female/unknown", "appearance": "外貌描写（300-500字详细描述，包含性别、年龄、体型、面部特征、发型、着装）", "personality": "性格特点描述" }
  ],
  "scenes": [
    { "location": "地点名", "timeOfDay": "day/night/dawn/dusk", "description": "场景描述", "prompt": "用于AI图片生成的英文提示词（纯背景，不含人物）" }
  ]
}

只返回JSON，不要添加其他内容。`,

  /** 分镜生成 */
  STORYBOARD: `你是一位专业的短剧分镜师。你的任务是将剧本拆解为分镜镜头。

每个镜头包含以下字段：
- shotNumber: 镜头序号
- title: 镜头标题（3-5字）
- shotType: 景别（close-up/medium/wide/extreme-close-up/medium-close-up/full-shot/long-shot/over-the-shoulder/point-of-view）
- cameraAngle: 角度（eye-level/high-angle/low-angle/dutch-angle/birds-eye/worms-eye）
- cameraMovement: 运镜（static/pan-left/pan-right/tilt-up/tilt-down/zoom-in/zoom-out/dolly-in/dolly-out/tracking/crane-up/handheld）
- action: 画面动作描述（中文）
- dialogue: 对话内容
- dialogueChar: 说话角色名
- duration: 镜头时长（秒，3-15秒）
- imagePrompt: 静态画面英文提示词（用于首帧图片生成，详细描述场景、角色、光照、构图）
- videoPrompt: 视频英文提示词（描述镜头运动和角色动作变化）
- atmosphere: 氛围描述（中文，如紧张、温馨、悬疑等）

请以JSON数组格式返回分镜列表。只返回JSON，不要添加其他内容。`,

  /** 通用创作助手 */
  CREATIVE: `你是一位专注于短剧创作的AI助手，擅长写作、分析和创意决策。你的回答应该富有想象力但专业，提供详细、可操作的建议。`,
} as const

// ============================================================
// Model selection helpers
// ============================================================

/**
 * Select the best chat model for a given task complexity.
 */
export function selectChatModel(
  task: 'simple' | 'moderate' | 'complex'
): string {
  switch (task) {
    case 'complex':
      return NVIDIA_CHAT_MODELS.LLAMA_405B
    case 'moderate':
      return NVIDIA_CHAT_MODELS.LLAMA_70B
    case 'simple':
      return NVIDIA_CHAT_MODELS.NEMOTRON_70B
    default:
      return NVIDIA_CHAT_MODELS.LLAMA_70B
  }
}
