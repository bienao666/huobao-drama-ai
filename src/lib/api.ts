import type {
  Drama,
  DramaDetail,
  Episode,
  EpisodeDetail,
  Character,
  Scene,
  Storyboard,
} from './store'

// ============================================================
// Helper — typed fetch wrapper
// ============================================================

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ============================================================
// Settings types
// ============================================================

export interface AiSettings {
  chatModel: string
  imageModel: string
  imageProvider: 'nvidia' | 'z-ai-sdk'
  ttsVoice: string
  videoQuality: 'speed' | 'quality'
  videoDuration: number
  videoFps: number
  videoSize: string
}

export interface SettingsResponse {
  settings: AiSettings
  apiStatus: {
    nvidiaAvailable: boolean
    imageProvider: string
    defaultChatModel: string
    defaultImageModel: string
  }
}

// ============================================================
// API client
// ============================================================

export const api = {
  // ---- Dramas ----
  dramas: {
    list: () =>
      request<{ dramas: Drama[] }>('/api/dramas').then((r) => r.dramas),

    get: (id: string) =>
      request<DramaDetail>(`/api/dramas/${id}`),

    create: (data: Partial<Drama>) =>
      request<Drama>('/api/dramas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<Drama>) =>
      request<Drama>(`/api/dramas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      fetch(`/api/dramas/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error(`Delete drama failed: ${r.status}`)
      }),
  },

  // ---- Episodes ----
  episodes: {
    list: (dramaId: string) =>
      request<{ episodes: Episode[] }>(`/api/dramas/${dramaId}/episodes`).then(
        (r) => r.episodes
      ),

    get: (id: string) =>
      request<EpisodeDetail>(`/api/episodes/${id}`),

    create: (dramaId: string, data: Partial<Episode>) =>
      request<Episode>(`/api/dramas/${dramaId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<Episode>) =>
      request<Episode>(`/api/episodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      fetch(`/api/episodes/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error(`Delete episode failed: ${r.status}`)
      }),
  },

  // ---- Characters ----
  characters: {
    list: (dramaId: string) =>
      request<{ characters: Character[] }>(
        `/api/dramas/${dramaId}/characters`
      ).then((r) => r.characters),

    create: (dramaId: string, data: Partial<Character>) =>
      request<Character>(`/api/dramas/${dramaId}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },

  // ---- Scenes ----
  scenes: {
    list: (dramaId: string) =>
      request<{ scenes: Scene[] }>(`/api/dramas/${dramaId}/scenes`).then(
        (r) => r.scenes
      ),

    create: (dramaId: string, data: Partial<Scene>) =>
      request<Scene>(`/api/dramas/${dramaId}/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },

  // ---- Storyboards ----
  storyboards: {
    list: (episodeId: string) =>
      request<{ storyboards: Storyboard[] }>(
        `/api/episodes/${episodeId}/storyboards`
      ).then((r) => r.storyboards),

    create: (episodeId: string, data: Partial<Storyboard>) =>
      request<Storyboard>(`/api/episodes/${episodeId}/storyboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<Storyboard>) =>
      request<Storyboard>(`/api/storyboards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },

  // ---- AI endpoints ----
  ai: {
    rewriteScript: (episodeId: string) =>
      request<{ episode: Episode }>('/api/ai/rewrite-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId }),
      }),

    extract: (episodeId: string, dramaId: string) =>
      request<{ characters: Character[]; scenes: Scene[] }>(
        '/api/ai/extract',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodeId, dramaId }),
        }
      ),

    generateStoryboard: (episodeId: string) =>
      request<{ storyboards: Storyboard[] }>(
        '/api/ai/generate-storyboard',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodeId }),
        }
      ),

    generateImage: (prompt: string, size?: string) =>
      request<{ imageUrl: string; prompt: string }>('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size }),
      }),

    generateCharacterImage: (characterId: string, style?: string) =>
      request<{ character: Character; imageUrl: string }>(
        '/api/ai/generate-character-image',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, style }),
        }
      ),

    generateVideo: (
      storyboardId: string,
      prompt?: string,
      firstFrameUrl?: string
    ) =>
      request<{ storyboard: Storyboard }>('/api/ai/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyboardId, prompt, firstFrameUrl }),
      }),

    generateTts: (storyboardId: string, text?: string, voiceId?: string) =>
      request<{ storyboard: Storyboard }>('/api/ai/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyboardId, text, voiceId }),
      }),

    testConnection: () =>
      request<{
        success: boolean
        model?: string
        imageProvider?: string
        nvidiaAvailable: boolean
        error?: string
        responsePreview?: string
      }>('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
  },

  // ---- Settings ----
  settings: {
    get: () => request<SettingsResponse>('/api/settings'),

    save: (data: Partial<AiSettings>) =>
      request<{ settings: AiSettings }>('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },
}
