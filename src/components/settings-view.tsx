'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Settings,
  Key,
  Cpu,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Volume2,
  Film,
  Sparkles,
} from 'lucide-react'

export function SettingsView() {
  const { navigateToProjects } = useAppStore()
  const { toast } = useToast()

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; model?: string; error?: string } | null>(null)

  // Settings fields
  const [llmApiKey, setLlmApiKey] = useState('')
  const [llmBaseUrl, setLlmBaseUrl] = useState('')
  const [llmModel, setLlmModel] = useState('')
  const [imageApiKey, setImageApiKey] = useState('')
  const [imageBaseUrl, setImageBaseUrl] = useState('')
  const [imageModel, setImageModel] = useState('')
  const [ttsApiKey, setTtsApiKey] = useState('')
  const [ttsBaseUrl, setTtsBaseUrl] = useState('')
  const [ttsModel, setTtsModel] = useState('')
  const [videoApiKey, setVideoApiKey] = useState('')
  const [videoBaseUrl, setVideoBaseUrl] = useState('')
  const [videoModel, setVideoModel] = useState('')

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.settings.get()
        setLlmApiKey(data.LLM_API_KEY ?? '')
        setLlmBaseUrl(data.LLM_BASE_URL ?? '')
        setLlmModel(data.LLM_MODEL ?? '')
        setImageApiKey(data.IMAGE_API_KEY ?? '')
        setImageBaseUrl(data.IMAGE_BASE_URL ?? '')
        setImageModel(data.IMAGE_MODEL ?? '')
        setTtsApiKey(data.TTS_API_KEY ?? '')
        setTtsBaseUrl(data.TTS_BASE_URL ?? '')
        setTtsModel(data.TTS_MODEL ?? '')
        setVideoApiKey(data.VIDEO_API_KEY ?? '')
        setVideoBaseUrl(data.VIDEO_BASE_URL ?? '')
        setVideoModel(data.VIDEO_MODEL ?? '')
      } catch {
        // Settings may not exist yet, that's fine
      }
    }
    loadSettings()
  }, [])

  // Save settings
  const handleSave = async () => {
    setSaving(true)
    try {
      await api.settings.save({
        LLM_API_KEY: llmApiKey,
        LLM_BASE_URL: llmBaseUrl,
        LLM_MODEL: llmModel,
        IMAGE_API_KEY: imageApiKey,
        IMAGE_BASE_URL: imageBaseUrl,
        IMAGE_MODEL: imageModel,
        TTS_API_KEY: ttsApiKey,
        TTS_BASE_URL: ttsBaseUrl,
        TTS_MODEL: ttsModel,
        VIDEO_API_KEY: videoApiKey,
        VIDEO_BASE_URL: videoBaseUrl,
        VIDEO_MODEL: videoModel,
      })
      toast({ title: '设置已保存' })
    } catch (err) {
      toast({ title: '保存失败', description: String(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Test connection
  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.ai.testConnection()
      setTestResult(result)
      if (result.success) {
        toast({ title: '连接成功', description: result.model ? `模型: ${result.model}` : undefined })
      } else {
        toast({ title: '连接失败', description: result.error, variant: 'destructive' })
      }
    } catch (err) {
      setTestResult({ success: false, error: String(err) })
      toast({ title: '连接失败', description: String(err), variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToProjects}
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">返回</span>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <Settings className="size-5 text-primary" />
            <h1 className="text-xl font-bold">平台设置</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Cpu className="size-3.5" />}
              测试连接
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="amber-glow"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              保存设置
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Connection test result */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className={`border-border/50 ${testResult.success ? 'border-emerald-500/30' : 'border-destructive/30'}`}>
              <CardContent className="p-4 flex items-center gap-3">
                {testResult.success ? (
                  <CheckCircle2 className="size-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="size-5 text-destructive flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {testResult.success ? '连接成功' : '连接失败'}
                  </p>
                  {(testResult.model || testResult.error) && (
                    <p className="text-xs text-muted-foreground">
                      {testResult.model && `模型: ${testResult.model}`}
                      {testResult.error && `错误: ${testResult.error}`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* LLM Settings */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              LLM 语言模型
              <Badge variant="secondary" className="text-[10px]">剧本改写 / 提取 / 分镜</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Key className="size-3" />
                  API Key
                </Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  className="bg-muted/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Cpu className="size-3" />
                  模型名称
                </Label>
                <Input
                  placeholder="gpt-4o / deepseek-chat / ..."
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="bg-muted/30 border-border/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Base URL</Label>
              <Input
                placeholder="https://api.openai.com/v1"
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                className="bg-muted/30 border-border/50"
              />
              <p className="text-[10px] text-muted-foreground">支持 OpenAI 兼容接口，可使用中转站地址</p>
            </div>
          </CardContent>
        </Card>

        {/* Image Generation Settings */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="size-4 text-primary" />
              图片生成
              <Badge variant="secondary" className="text-[10px]">角色头像 / 分镜首帧</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Key className="size-3" />
                  API Key
                </Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={imageApiKey}
                  onChange={(e) => setImageApiKey(e.target.value)}
                  className="bg-muted/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Cpu className="size-3" />
                  模型名称
                </Label>
                <Input
                  placeholder="dall-e-3 / flux / ..."
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className="bg-muted/30 border-border/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Base URL</Label>
              <Input
                placeholder="https://api.openai.com/v1"
                value={imageBaseUrl}
                onChange={(e) => setImageBaseUrl(e.target.value)}
                className="bg-muted/30 border-border/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Video Generation Settings */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Film className="size-4 text-primary" />
              视频生成
              <Badge variant="secondary" className="text-[10px]">镜头动画</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Key className="size-3" />
                  API Key
                </Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={videoApiKey}
                  onChange={(e) => setVideoApiKey(e.target.value)}
                  className="bg-muted/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Cpu className="size-3" />
                  模型名称
                </Label>
                <Input
                  placeholder="kling / runway / ..."
                  value={videoModel}
                  onChange={(e) => setVideoModel(e.target.value)}
                  className="bg-muted/30 border-border/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Base URL</Label>
              <Input
                placeholder="https://api.example.com/v1"
                value={videoBaseUrl}
                onChange={(e) => setVideoBaseUrl(e.target.value)}
                className="bg-muted/30 border-border/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* TTS Settings */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="size-4 text-primary" />
              语音合成 (TTS)
              <Badge variant="secondary" className="text-[10px]">角色配音</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Key className="size-3" />
                  API Key
                </Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={ttsApiKey}
                  onChange={(e) => setTtsApiKey(e.target.value)}
                  className="bg-muted/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Cpu className="size-3" />
                  模型名称
                </Label>
                <Input
                  placeholder="tts-1 / cosmos / ..."
                  value={ttsModel}
                  onChange={(e) => setTtsModel(e.target.value)}
                  className="bg-muted/30 border-border/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Base URL</Label>
              <Input
                placeholder="https://api.openai.com/v1"
                value={ttsBaseUrl}
                onChange={(e) => setTtsBaseUrl(e.target.value)}
                className="bg-muted/30 border-border/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bottom save */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <p className="text-xs text-muted-foreground">
            API Key 等敏感信息仅保存在服务端，不会泄露到客户端
          </p>
          <Button onClick={handleSave} disabled={saving} className="amber-glow">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            保存设置
          </Button>
        </div>
      </main>
    </div>
  )
}
