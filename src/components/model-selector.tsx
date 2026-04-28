'use client'

import { useState, useEffect } from 'react'
import { api, type AiCategory } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Sparkles, ImageIcon, Film, ChevronDown, Check, Volume2 } from 'lucide-react'

interface ModelOption {
  id: string
  name: string
  tags?: string[]
}

interface ModelSelectorProps {
  category: AiCategory
  value: string
  onChange: (model: string) => void
}

const CATEGORY_ICONS: Record<AiCategory, React.ReactNode> = {
  llm: <Sparkles className="size-3" />,
  image: <ImageIcon className="size-3" />,
  video: <Film className="size-3" />,
  tts: <Volume2 className="size-3" />,
}

export function ModelSelector({ category, value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelOption[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Fetch available models from the presets via settings API
    api.settings.get().then((data) => {
      const presetList = data.presets[category]
      const allModels: ModelOption[] = []
      for (const preset of presetList) {
        if (preset.availableModels) {
          for (const m of preset.availableModels) {
            if (!allModels.some(x => x.id === m.id)) {
              allModels.push(m)
            }
          }
        }
      }
      setModels(allModels)
    }).catch(() => {})
  }, [category])

  // Find the display name for current model
  const currentModel = models.find(m => m.id === value)
  const displayName = currentModel?.name || value || '未选择'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 gap-1 text-[10px] font-mono"
        >
          {CATEGORY_ICONS[category]}
          <span className="max-w-[80px] truncate">{displayName}</span>
          <ChevronDown className="size-2.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="end">
        <div className="max-h-64 overflow-y-auto">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded-sm transition-colors"
            >
              {value === m.id && <Check className="size-3 text-primary flex-shrink-0" />}
              {value !== m.id && <span className="w-3" />}
              <span className="truncate font-medium">{m.name}</span>
              <span className="text-[9px] text-muted-foreground truncate ml-auto">{m.id}</span>
            </button>
          ))}
          {models.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">暂无可用模型，请先在设置中配置</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
