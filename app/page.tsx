'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Script, Scene } from '@/types/script'
import { useAssetStore } from '@/store/useAssetStore'
import { Asset, AssetCategory } from '@/types/assets'
import { Card, Button, Input, Textarea } from '@/app/components'
import { 
  Home as HomeIcon, 
  FileText, 
  ScrollText, 
  Package, 
  LayoutGrid, 
  Video, 
  Play,
  Plus,
  Sparkles,
  User,
  MapPin,
  Box,
  RefreshCw,
  Volume2,
  X,
  Image,
  Edit3,
  CheckCircle,
  Clock,
  Loader,
  Search,
  Trash2,
  Save,
  Sparkles as SparklesIcon,
  Loader2
} from 'lucide-react'

// --- 类型定义 ---
type Step = {
  id: string
  name: string
  icon: React.ReactNode
}

// --- 模拟数据 ---
const steps: Step[] = [
  { id: 'overview', name: '项目概览', icon: <HomeIcon size={20} /> },
  { id: 'story', name: '故事改编', icon: <FileText size={20} /> },
  { id: 'script', name: '剧本管理', icon: <ScrollText size={20} /> },
  { id: 'assets', name: '资产中心', icon: <Package size={20} /> },
  { id: 'storyboard', name: '分镜管理', icon: <LayoutGrid size={20} /> },
  { id: 'generate', name: '视频生成', icon: <Video size={20} /> },
  { id: 'preview', name: '全片预览', icon: <Play size={20} /> },
]

// 解析结果数据类型
type AnalysisResult = {
  coreAssets: {
    characters: string[]
    scenes: string[]
  }
  scriptOutline: {
    chapters: Array<{
      title: string
      description: string
    }>
  }
}

// 资产类型
type AssetType = 'character' | 'scene' | 'prop'

// 角色资产类型
type CharacterAsset = {
  id: string
  name: string
  prompt: string
  previewImage?: string
  voiceModel: string
  speed: number
  emotion: number
  status: 'generated' | 'pending' // 已生成/待更新
}

// 模拟角色数据
const mockCharacters: CharacterAsset[] = [
  {
    id: '1',
    name: '赛博剑客',
    prompt: 'A cyberpunk samurai warrior with neon-lit armor, futuristic katana, glowing blue eyes, standing in a rain-soaked neon street',
    voiceModel: 'cold-male',
    speed: 50,
    emotion: 70,
    status: 'generated'
  },
  {
    id: '2',
    name: 'AI 少女',
    prompt: 'A beautiful AI android girl with silver hair, holographic dress, gentle expression, soft lighting, sci-fi aesthetic',
    voiceModel: 'gentle-female',
    speed: 45,
    emotion: 80,
    status: 'generated'
  },
  {
    id: '3',
    name: '神秘黑客',
    prompt: 'A mysterious hacker in dark hoodie, multiple screens reflecting on glasses, dim underground lab, cyberpunk atmosphere',
    voiceModel: 'ai-mechanical',
    speed: 55,
    emotion: 40,
    status: 'pending'
  }
]

// 预设音色选项
const voicePresets = [
  { id: 'cold-male', name: '冷酷男声' },
  { id: 'gentle-female', name: '温柔女声' },
  { id: 'ai-mechanical', name: 'AI机械' },
]

// 分镜类型
type StoryboardStatus = 'image-generated' | 'audio-synthesized' | 'waiting-render' | 'pending'

type StoryboardItem = {
  id: string
  imageUrl?: string
  characterId: string | null
  sceneId: string | null
  dialogue: string
  visualDescription?: string  // 视觉画面描述（来自场景的 content）
  status: StoryboardStatus
  isGeneratingAudio: boolean
}

// 模拟场景数据
const mockScenes = [
  { id: 'scene-1', name: '霓虹街头', prompt: 'A neon-lit cyberpunk street at night, rain-soaked, futuristic cityscape, vibrant neon signs, atmospheric lighting' },
  { id: 'scene-2', name: '地下实验室', prompt: 'A dim underground laboratory, multiple screens, high-tech equipment, mysterious atmosphere, sci-fi setting' },
  { id: 'scene-3', name: '虚拟空间', prompt: 'A virtual reality space, digital environment, holographic elements, abstract geometric shapes, cyber aesthetic' },
]

// 艺术风格类型
const artStyles = [
  { id: '3d-clay', name: '3D 粘土', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'cyberpunk', name: '赛博朋克', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'ink-wash', name: '水墨风', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { id: 'pixar', name: '皮克斯', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'ghibli', name: '吉卜力', color: 'bg-green-100 text-green-700 border-green-300' },
]

// 文化背景类型
const culturalBackgrounds = [
  { id: 'chinese-ancient', name: '中式古装', color: 'bg-red-100 text-red-700 border-red-300' },
  { id: 'chinese-modern', name: '中式现代', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  { id: 'japanese', name: '日本文化', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { id: 'nordic', name: '极简北欧', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
]

export default function App() {
  const [currentStep, setCurrentStep] = useState('overview')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // 背景设置状态
  const [selectedArtStyle, setSelectedArtStyle] = useState<string | null>(null)
  const [selectedCulturalBg, setSelectedCulturalBg] = useState<string | null>(null)
  
  // 故事改编相关状态
  const [storyText, setStoryText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [storyAdaptation, setStoryAdaptation] = useState<{
    story_outline: string
    assets: {
      characters: Array<{ name: string; description: string }>
      props: Array<{ name: string; description: string }>
      scenes: Array<{ name: string; description: string }>
      theme: {
        visual_style: string
        color_palette: string
      }
    }
  } | null>(null)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [scriptGenerationError, setScriptGenerationError] = useState<string | null>(null)
  const [scriptGenerationProgress, setScriptGenerationProgress] = useState(0)

  // 调用故事改编 API
  const handleAdaptStory = async () => {
    if (!storyText.trim()) {
      alert('请先输入故事内容')
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/adapt-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalContent: storyText.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '改编失败，请稍后重试')
      }

      const data = await response.json()
      const adaptation = data.adaptation
      setStoryAdaptation(adaptation)
      
      // 将资产转换为统一的 Asset 格式并同步到资产中心
      if (adaptation && adaptation.assets) {
        const store = useAssetStore.getState()
        const assetsToSync: Asset[] = []
        
        // 转换角色
        if (Array.isArray(adaptation.assets.characters)) {
          adaptation.assets.characters.forEach((char: any) => {
            assetsToSync.push({
              id: `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              category: AssetCategory.CHARACTER,
              name: char.name || '',
              visualDescription: char.description || '',
              referenceImageUrl: null,
              createdAt: new Date(),
            })
          })
        }
        
        // 转换道具
        if (Array.isArray(adaptation.assets.props)) {
          adaptation.assets.props.forEach((prop: any) => {
            assetsToSync.push({
              id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              category: AssetCategory.PROP,
              name: prop.name || '',
              visualDescription: prop.description || (prop.visualDetails || ''),
              referenceImageUrl: null,
              createdAt: new Date(),
            })
          })
        }
        
        // 转换场景
        if (Array.isArray(adaptation.assets.scenes)) {
          adaptation.assets.scenes.forEach((scene: any) => {
            assetsToSync.push({
              id: `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              category: AssetCategory.SCENE,
              name: scene.name || '',
              visualDescription: scene.description || '',
              referenceImageUrl: null,
              createdAt: new Date(),
            })
          })
        }
        
        // 转换主题（如果有）
        if (adaptation.assets.theme) {
          const themeValue = typeof adaptation.assets.theme === 'object' 
            ? adaptation.assets.theme.visual_style 
            : adaptation.assets.theme
          
          if (themeValue) {
            assetsToSync.push({
              id: `theme-${Date.now()}`,
              category: AssetCategory.THEME,
              name: themeValue,
              visualDescription: typeof adaptation.assets.theme === 'object' 
                ? `${adaptation.assets.theme.visual_style} - ${adaptation.assets.theme.color_palette || ''}`
                : themeValue,
              referenceImageUrl: null,
              createdAt: new Date(),
            })
          }
        }
        
        // 同步资产到 store（会自动持久化到 localStorage）
        if (assetsToSync.length > 0) {
          store.syncAssets(assetsToSync)
          
          // 统计各类资产数量
          const characterCount = assetsToSync.filter(a => a.category === AssetCategory.CHARACTER).length
          const propCount = assetsToSync.filter(a => a.category === AssetCategory.PROP).length
          const sceneCount = assetsToSync.filter(a => a.category === AssetCategory.SCENE).length
          
          // 显示 Toast 提示
          const message = `已识别并同步 ${characterCount} 个角色、${propCount} 个道具和 ${sceneCount} 个场景至资产中心`
          setToastMessage(message)
          setToastVisible(true)
          
          // 3 秒后自动隐藏 Toast
          setTimeout(() => {
            setToastVisible(false)
            setTimeout(() => setToastMessage(null), 300) // 等待动画完成后再清除消息
          }, 3000)
        }
        
        // 同时使用旧方法保持兼容性（用于设置 theme）
        store.addAssetsFromStory(adaptation.assets)
      }
      
      setIsAnalyzing(false)
    } catch (error: any) {
      console.error('故事改编失败:', error)
      alert(error.message || '改编失败，请检查 API 配置或稍后重试')
      setIsAnalyzing(false)
    }
  }

  // 获取 router 实例
  const router = useRouter()

  // 确认改编并生成剧本
  const handleConfirmAdaptationAndGenerate = async (retry = false) => {
    if (!storyAdaptation) {
      alert('请先完成故事改编')
      return
    }

    setIsGeneratingScript(true)
    setScriptGenerationError(null)
    setScriptGenerationProgress(0)

    // 模拟进度条（实际 API 调用可能需要 10-15 秒）
    const progressInterval = setInterval(() => {
      setScriptGenerationProgress((prev) => {
        if (prev >= 90) {
          return prev // 保持在 90%，等待实际完成
        }
        return prev + Math.random() * 10
      })
    }, 500)

    try {
      // 直接调用 API 生成剧本
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyOutline: storyAdaptation,
        }),
      })

      clearInterval(progressInterval)
      setScriptGenerationProgress(100)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '生成剧本失败，请稍后重试')
      }

      const data = await response.json()
      const generatedScenes: Scene[] = data.scenes || []

      if (generatedScenes.length === 0) {
        throw new Error('未生成任何场景，请重试')
      }

      // 创建新剧本并添加到列表
      const newScript: Script = {
        id: `script-${Date.now()}`,
        title: typeof storyAdaptation.assets.theme === 'object' 
          ? storyAdaptation.assets.theme.visual_style 
          : storyAdaptation.assets.theme || '新剧本',
        author: 'AI 生成',
        createdAt: new Date(),
        scenes: generatedScenes,
      }

      // 添加到剧本列表（确保数据透传）
      setScripts((prev) => {
        const updated = [...prev, newScript]
        // 保存到 localStorage 确保数据持久化
        try {
          const serialized = updated.map(script => ({
            ...script,
            createdAt: script.createdAt instanceof Date 
              ? script.createdAt.toISOString() 
              : typeof script.createdAt === 'string' 
                ? script.createdAt 
                : new Date().toISOString(),
          }))
          localStorage.setItem('ai-video-platform-scripts', JSON.stringify(serialized))
        } catch (error) {
          console.error('保存剧本数据失败:', error)
        }
        return updated
      })

      // 选中新创建的剧本（确保数据透传）
      setSelectedScript(newScript)

      // 跳转到剧本管理页面
      setCurrentStep('script')
      if (typeof window !== 'undefined') {
        window.location.hash = 'script'
        // 使用 setTimeout 确保状态更新后再滚动到选中项
        setTimeout(() => {
          const scriptElement = document.querySelector(`[data-script-id="${newScript.id}"]`)
          if (scriptElement) {
            scriptElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }

      // 显示成功提示
      alert(`成功生成 ${generatedScenes.length} 个场景的剧本！`)
    } catch (error: any) {
      console.error('生成剧本失败:', error)
      clearInterval(progressInterval)
      setScriptGenerationError(error.message || '生成剧本失败，请检查 API 配置或稍后重试')
    } finally {
      setIsGeneratingScript(false)
      setScriptGenerationProgress(0)
    }
  }


  // 资产中心相关状态
  const [assetTab, setAssetTab] = useState<'character' | 'prop' | 'scene' | 'settings'>('character')
  
  // 从 Zustand Store 获取资产数据
  const storeCharacters = useAssetStore((state) => state.characters)
  const storeProps = useAssetStore((state) => state.props)
  const storeScenes = useAssetStore((state) => state.scenes)
  const storeTheme = useAssetStore((state) => state.theme)
  const updateCharacter = useAssetStore((state) => state.updateCharacter)
  const updateProp = useAssetStore((state) => state.updateProp)
  const updateScene = useAssetStore((state) => state.updateScene)
  const setTheme = useAssetStore((state) => state.setTheme)
  const removeCharacter = useAssetStore((state) => state.removeCharacter)
  const removeProp = useAssetStore((state) => state.removeProp)
  const removeScene = useAssetStore((state) => state.removeScene)
  
  /**
   * 从文本描述中提取资产名称
   * 匹配资产中心中的角色、道具、场景名称
   */
  const extractAssetNames = (text: string): string[] => {
    const store = useAssetStore.getState()
    const allAssets = [
      ...store.getAssetsByCategory(AssetCategory.CHARACTER),
      ...store.getAssetsByCategory(AssetCategory.PROP),
      ...store.getAssetsByCategory(AssetCategory.SCENE),
    ]
    
    const foundAssets: string[] = []
    allAssets.forEach(asset => {
      // 检查文本中是否包含资产名称
      if (text.includes(asset.name)) {
        foundAssets.push(asset.name)
      }
    })
    
    return foundAssets
  }

  /**
   * 组装增强的 Prompt 和提取参考图像
   * 1. 基础：scene.visual_description (content)
   * 2. 资产增强：如果描述中提到了已存在的资产，自动附加该资产的视觉描述
   * 3. 风格对齐：附加资产中心里的 theme.visual_style 关键词
   * 4. 返回增强的 Prompt 和参考图像 ID（如果资产有已生成的参考图）
   */
  const buildEnhancedPrompt = (scene: Scene): { prompt: string; referenceImageId?: string } => {
    let prompt = scene.content || ''
    let referenceImageId: string | undefined = undefined
    
    // 资产增强：提取并附加资产描述，同时查找参考图
    const assetNames = extractAssetNames(scene.content)
    if (assetNames.length > 0) {
      const store = useAssetStore.getState()
      const allAssets = [
        ...store.getAssetsByCategory(AssetCategory.CHARACTER),
        ...store.getAssetsByCategory(AssetCategory.PROP),
        ...store.getAssetsByCategory(AssetCategory.SCENE),
      ]
      
      const assetDescriptions: string[] = []
      
      // 优先查找角色资产的参考图（角色一致性最重要）
      for (const name of assetNames) {
        const asset = allAssets.find(a => a.name === name)
        if (asset) {
          // 如果是角色资产且有参考图，使用第一个找到的角色参考图
          if (asset.category === AssetCategory.CHARACTER && asset.referenceImageUrl && !referenceImageId) {
            referenceImageId = asset.referenceImageUrl
          }
          
          // 附加资产描述
          if (asset.visualDescription) {
            assetDescriptions.push(`${asset.name}: ${asset.visualDescription}`)
          }
        }
      }
      
      if (assetDescriptions.length > 0) {
        prompt += `. Asset details: ${assetDescriptions.join('; ')}`
      }
    }
    
    // 风格对齐：附加主题视觉风格
    const store = useAssetStore.getState()
    if (store.theme) {
      prompt += `. Visual style: ${store.theme}`
    }
    
    return {
      prompt: prompt.trim(),
      referenceImageId
    }
  }

  /**
   * 批量生成分镜
   */
  const handleBatchGenerateStoryboards = async () => {
    if (!selectedScript || selectedScript.scenes.length === 0 || isBatchGenerating) {
      return
    }

    setIsBatchGenerating(true)
    setSceneGenerationProgress({})

    try {
      // 使用 for...of 循环串行执行，确保一个资产生成完毕后再开始下一个
      for (const [index, scene] of selectedScript.scenes.entries()) {
        // 如果不是第一个场景，添加 2 秒间歇时间（Cooldown）以降低触发 429 的风险
        if (index > 0) {
          console.log(`等待 2 秒间歇时间后继续生成场景 ${scene.sceneNumber}...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        // 更新进度（开始生成）
        setSceneGenerationProgress(prev => ({
          ...prev,
          [scene.sceneNumber]: 10
        }))

        try {
          // 组装增强的 Prompt 和提取参考图像 ID
          const { prompt: enhancedPrompt, referenceImageId } = buildEnhancedPrompt(scene)
          
          // 调用生成图像 API（创建任务）
          const requestBody: any = {
            assetId: `scene-${selectedScript.id}-${scene.sceneNumber}`,
            description: enhancedPrompt,
            category: 'scene', // 场景使用 21:9 比例
          }
          
          // 如果有参考图像 ID，传递它以确保角色一致性
          if (referenceImageId) {
            requestBody.reference_image_id = referenceImageId
            console.log(`场景 ${scene.sceneNumber} 使用参考图像确保角色一致性:`, referenceImageId.substring(0, 50) + '...')
          }
          
          const createResponse = await fetch('/api/generate-asset-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })

          if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({}))
            console.error(`场景 ${scene.sceneNumber} 创建任务失败:`, errorData.error)
            setSceneGenerationProgress(prev => ({
              ...prev,
              [scene.sceneNumber]: -1 // -1 表示失败
            }))
            continue // 跳过当前场景，继续下一个
          }

          const createData = await createResponse.json()
          
          if (!createData.success || !createData.taskId) {
            console.error(`场景 ${scene.sceneNumber} 创建任务失败:`, createData.error)
            setSceneGenerationProgress(prev => ({
              ...prev,
              [scene.sceneNumber]: -1
            }))
            continue
          }

          const taskId = createData.taskId
          
          // 轮询任务状态直到完成
          const maxAttempts = 60 // 最多轮询 60 次（2分钟，每2秒一次）
          let attempts = 0
          let imageUrl: string | null = null
          
          // 更新进度（开始轮询）
          const progressInterval = setInterval(() => {
            setSceneGenerationProgress(prev => {
              const current = prev[scene.sceneNumber] || 10
              if (current >= 90) return prev
              // 基于轮询次数估算进度
              const estimatedProgress = Math.min(90, 10 + (attempts / maxAttempts) * 80)
              return {
                ...prev,
                [scene.sceneNumber]: estimatedProgress
              }
            })
          }, 500)
          
          // 轮询直到完成或失败
          while (attempts < maxAttempts && !imageUrl) {
            attempts++
            
            try {
              const statusResponse = await fetch(`/api/check-image-task?taskId=${taskId}`)
              
              if (!statusResponse.ok) {
                throw new Error('检查任务状态失败')
              }
              
              const statusData = await statusResponse.json()
              
              if (statusData.success) {
                // 更新进度
                const estimatedProgress = Math.min(90, 10 + (attempts / maxAttempts) * 80)
                setSceneGenerationProgress(prev => ({
                  ...prev,
                  [scene.sceneNumber]: estimatedProgress
                }))
                
                // 如果任务完成
                if (statusData.status === 'completed' && statusData.imageUrl) {
                  imageUrl = statusData.imageUrl
                  clearInterval(progressInterval)
                  break
                }
                
                // 如果任务失败
                if (statusData.status === 'failed') {
                  clearInterval(progressInterval)
                  throw new Error(statusData.error || '图像生成失败')
                }
              }
              
              // 等待 2 秒后继续轮询
              await new Promise(resolve => setTimeout(resolve, 2000))
            } catch (error: any) {
              clearInterval(progressInterval)
              throw error
            }
          }
          
          clearInterval(progressInterval)
          
          // 如果超时
          if (!imageUrl && attempts >= maxAttempts) {
            throw new Error('生成超时，请稍后重试')
          }
          
          // 如果成功获取到图像 URL
          if (imageUrl) {
            // 更新场景的 imageUrl
            const updatedScenes = [...selectedScript.scenes]
            updatedScenes[index] = {
              ...updatedScenes[index],
              imageUrl: imageUrl
            }
            
            const updatedScript = {
              ...selectedScript,
              scenes: updatedScenes
            }
            
            setSelectedScript(updatedScript)
            setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))
            
            setSceneGenerationProgress(prev => ({
              ...prev,
              [scene.sceneNumber]: 100
            }))
            
            console.log(`场景 ${scene.sceneNumber} 生成完成`)
          }
        } catch (error: any) {
          console.error(`场景 ${scene.sceneNumber} 生成失败:`, error)
          setSceneGenerationProgress(prev => ({
            ...prev,
            [scene.sceneNumber]: -1
          }))
          // 继续处理下一个场景，不中断整个流程
        }
      }
      
      // 显示完成提示
      setToastMessage(`已生成 ${selectedScript.scenes.length} 个场景的分镜图`)
      setToastVisible(true)
      setTimeout(() => {
        setToastVisible(false)
        setTimeout(() => setToastMessage(null), 300)
      }, 3000)
    } catch (error: any) {
      console.error('批量生成分镜失败:', error)
      alert(error.message || '批量生成分镜失败，请稍后重试')
    } finally {
      setIsBatchGenerating(false)
      // 延迟清除进度，让用户看到完成状态
      setTimeout(() => {
        setSceneGenerationProgress({})
      }, 2000)
    }
  }

  // 图像生成处理函数
  const handleGenerateAssetImage = async (
    assetId: string,
    description: string,
    category: 'character' | 'prop' | 'scene'
  ) => {
    setGeneratingImageId(assetId)
    setGeneratingImageProgress(0)
    
    try {
      // 第一步：创建生成任务
      const createResponse = await fetch('/api/generate-asset-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId,
          description,
          category,
        }),
      })
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}))
        throw new Error(errorData.error || '视觉引擎正在维护，请稍后再试')
      }
      
      const createData = await createResponse.json()
      
      if (!createData.success || !createData.taskId) {
        throw new Error(createData.error || '创建生成任务失败')
      }
      
      const taskId = createData.taskId
      
      // 第二步：轮询任务状态
      const maxAttempts = 60 // 最多轮询 60 次（2分钟，每2秒一次）
      let attempts = 0
      
      const pollInterval = setInterval(async () => {
        attempts++
        
        try {
          const statusResponse = await fetch(`/api/check-image-task?taskId=${taskId}`)
          
          if (!statusResponse.ok) {
            throw new Error('检查任务状态失败')
          }
          
          const statusData = await statusResponse.json()
          
          if (statusData.success) {
            // 更新进度（基于轮询次数估算）
            const estimatedProgress = Math.min(90, (attempts / maxAttempts) * 90)
            setGeneratingImageProgress(estimatedProgress)
            
            // 如果任务完成
            if (statusData.status === 'completed' && statusData.imageUrl) {
              clearInterval(pollInterval)
              setGeneratingImageProgress(100)
              
              // 处理成功结果
              await handleImageGenerationSuccess(assetId, category, statusData.imageUrl)
              return
            }
            
            // 如果任务失败
            if (statusData.status === 'failed') {
              clearInterval(pollInterval)
              setGeneratingImageProgress(0)
              throw new Error(statusData.error || '视觉引擎正在维护，请稍后再试')
            }
          }
          
          // 如果超过最大尝试次数
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval)
            setGeneratingImageProgress(0)
            throw new Error('生成超时，请稍后重试')
          }
        } catch (error: any) {
          clearInterval(pollInterval)
          setGeneratingImageProgress(0)
          throw error
        }
      }, 2000) // 每 2 秒轮询一次
      
    } catch (error: any) {
      setGeneratingImageId(null)
      setGeneratingImageProgress(0)
      
      // 显示友好的错误提示
      const errorMessage = error.message || '视觉引擎正在维护，请稍后再试'
      setToastMessage(errorMessage)
      setToastVisible(true)
      
      setTimeout(() => {
        setToastVisible(false)
      }, 5000)
    }
  }
  
  /**
   * 处理图像生成成功的结果
   */
  const handleImageGenerationSuccess = async (
    assetId: string,
    category: 'character' | 'prop' | 'scene',
    imageUrl: string
  ) => {
    try {
        // 更新资产，保存图片 URL 到统一的 Asset 数组
        const store = useAssetStore.getState()
        let assetName = ''
        let assetDescription = ''
        
        // 获取资产名称和描述
        if (category === 'character') {
          const character = storeCharacters.find(c => c.id === assetId)
          if (character) {
            assetName = character.name
            assetDescription = character.description
          }
        } else if (category === 'prop') {
          const prop = storeProps.find(p => p.id === assetId)
          if (prop) {
            assetName = prop.name
            assetDescription = prop.visualDetails
          }
        } else if (category === 'scene') {
          const scene = storeScenes.find(s => s.id === assetId)
          if (scene) {
            assetName = scene.name
            assetDescription = scene.description
          }
        }
        
        if (assetName) {
          // 查找或创建对应的 Asset
          const assets = store.getAssetsByCategory(
            category === 'character' ? AssetCategory.CHARACTER :
            category === 'prop' ? AssetCategory.PROP :
            AssetCategory.SCENE
          )
          
          let asset = assets.find(a => a.name === assetName)
          
          if (asset) {
            // 更新现有资产
            store.syncAssets([{
              ...asset,
              referenceImageUrl: imageUrl
            }])
          } else {
            // 创建新资产（如果不存在）
            store.syncAssets([{
              id: assetId,
              category: category === 'character' ? AssetCategory.CHARACTER :
                       category === 'prop' ? AssetCategory.PROP :
                       AssetCategory.SCENE,
              name: assetName,
              visualDescription: assetDescription,
              referenceImageUrl: imageUrl,
              createdAt: new Date()
            }])
          }
        }
        
        // 显示成功提示
        setToastMessage(`"${category === 'character' ? storeCharacters.find(c => c.id === assetId)?.name : category === 'prop' ? storeProps.find(p => p.id === assetId)?.name : storeScenes.find(s => s.id === assetId)?.name}" 的形象已生成`)
        setToastVisible(true)
        
        // 清除生成状态
        setGeneratingImageId(null)
        setGeneratingImageProgress(0)
        
        // 3 秒后自动隐藏 Toast
        setTimeout(() => {
          setToastVisible(false)
        }, 3000)
    } catch (error: any) {
      // 错误已在主函数中处理
      console.error('处理图像生成成功结果时出错:', error)
    }
  }
  
  // 编辑状态
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [editingAssetType, setEditingAssetType] = useState<'character' | 'prop' | 'scene' | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  
  // 图像生成状态
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null)
  const [generatingImageProgress, setGeneratingImageProgress] = useState<number>(0)
  
  // 旧的资产状态（保留用于兼容）
  const [assets, setAssets] = useState<CharacterAsset[]>([
    // 初始默认角色
    {
      id: '1',
      name: '赛博剑客',
      prompt: 'A cyberpunk samurai warrior with neon-lit armor, futuristic katana, glowing blue eyes, standing in a rain-soaked neon street',
      voiceModel: 'cold-male',
      speed: 50,
      emotion: 70,
      status: 'generated'
    },
    {
      id: '2',
      name: 'AI 少女',
      prompt: 'A beautiful AI android girl with silver hair, holographic dress, gentle expression, soft lighting, sci-fi aesthetic',
      voiceModel: 'gentle-female',
      speed: 45,
      emotion: 80,
      status: 'generated'
    },
    {
      id: '3',
      name: '神秘黑客',
      prompt: 'A mysterious hacker in dark hoodie, multiple screens reflecting on glasses, dim underground lab, cyberpunk atmosphere',
      voiceModel: 'ai-mechanical',
      speed: 55,
      emotion: 40,
      status: 'pending'
    }
  ])
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterAsset | null>(null)
  const [editingPrompt, setEditingPrompt] = useState('')
  const [editingVoiceModel, setEditingVoiceModel] = useState('cold-male')
  const [editingSpeed, setEditingSpeed] = useState(50)
  const [editingEmotion, setEditingEmotion] = useState(70)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [showSaveNotification, setShowSaveNotification] = useState(false)
  
  // Toast 提示状态
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)

  // 分镜管理相关状态
  const [storyboards, setStoryboards] = useState<StoryboardItem[]>([
    {
      id: 'sb-1',
      characterId: null,
      sceneId: null,
      dialogue: '这里是第一段对白，点击可编辑...',
      status: 'pending',
      isGeneratingAudio: false
    },
    {
      id: 'sb-2',
      characterId: null,
      sceneId: null,
      dialogue: '这里是第二段对白，点击可编辑...',
      status: 'pending',
      isGeneratingAudio: false
    },
    {
      id: 'sb-3',
      characterId: null,
      sceneId: null,
      dialogue: '这里是第三段对白，点击可编辑...',
      status: 'pending',
      isGeneratingAudio: false
    },
    {
      id: 'sb-4',
      characterId: null,
      sceneId: null,
      dialogue: '这里是第四段对白，点击可编辑...',
      status: 'pending',
      isGeneratingAudio: false
    },
    {
      id: 'sb-5',
      characterId: null,
      sceneId: null,
      dialogue: '这里是第五段对白，点击可编辑...',
      status: 'pending',
      isGeneratingAudio: false
    },
    {
      id: 'sb-6',
      characterId: null,
      sceneId: null,
      dialogue: '这里是第六段对白，点击可编辑...',
      status: 'pending',
      isGeneratingAudio: false
    },
  ])
  const [editingStoryboardId, setEditingStoryboardId] = useState<string | null>(null)
  const [editingDialogue, setEditingDialogue] = useState('')
  const [hasLoadedPendingData, setHasLoadedPendingData] = useState(false)
  
  // 全局风格设定（从 localStorage 加载）
  const [globalStyle, setGlobalStyle] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    try {
      return localStorage.getItem('storyboard_global_style') || ''
    } catch {
      return ''
    }
  })

  // 保存全局风格到 localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (globalStyle.trim()) {
        localStorage.setItem('storyboard_global_style', globalStyle)
      } else {
        localStorage.removeItem('storyboard_global_style')
      }
    } catch {
      // 静默处理错误
    }
  }, [globalStyle])

  // 增强提示词函数：将剧本描述封装成更适合 AI 绘图的提示词
  const enhancePrompt = (visualDesc: string): string => {
    if (!visualDesc || visualDesc.trim() === '') {
      return ''
    }
    
    // 在原始描述后添加 AI 绘图增强词
    const enhancements = [
      'cinematic lighting',
      'highly detailed',
      '8k',
      'shot on 35mm lens',
      'professional photography',
      'cinematic composition',
    ]
    
    // 组合增强后的提示词
    return `${visualDesc.trim()}, ${enhancements.join(', ')}`
  }

  // 从 localStorage 加载待处理的分镜数据
  useEffect(() => {
    // 只在分镜管理页面且未加载过数据时执行
    if (currentStep !== 'storyboard' || hasLoadedPendingData) return

    try {
      const pendingData = localStorage.getItem('pending_storyboard_data')
      if (!pendingData) return

      const parsed = JSON.parse(pendingData)
      if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
        return
      }

      // 将场景数据转换为分镜卡片
      const newStoryboards: StoryboardItem[] = parsed.scenes.map((scene: Scene, index: number) => ({
        id: `sb-${Date.now()}-${index}`,
        characterId: null,
        sceneId: null,
        dialogue: scene.dialogue || '',
        visualDescription: scene.content || '',  // 视觉画面描述
        status: 'pending' as StoryboardStatus,
        isGeneratingAudio: false,
      }))

      // 更新分镜列表
      setStoryboards(newStoryboards)

      // 标记已加载，避免重复加载
      setHasLoadedPendingData(true)

      // 清除 localStorage 中的数据（可选，根据需求决定是否保留）
      // localStorage.removeItem('pending_storyboard_data')
    } catch (error) {
      // 静默处理错误，不影响页面正常显示
    }
  }, [currentStep, hasLoadedPendingData])

  // 当切换到分镜管理页面时，重置加载标记
  useEffect(() => {
    if (currentStep === 'storyboard') {
      // 可以在这里决定是否重置标记，允许重新加载
      // setHasLoadedPendingData(false)
    } else {
      // 离开分镜管理页面时重置标记
      setHasLoadedPendingData(false)
    }
  }, [currentStep])

  // localStorage 键名
  const SCRIPTS_STORAGE_KEY = 'ai-video-platform-scripts'

  // 从 localStorage 加载剧本数据
  const loadScriptsFromStorage = (): Script[] => {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(SCRIPTS_STORAGE_KEY)
      if (!stored) return []
      
      const parsed = JSON.parse(stored)
      // 将 createdAt 字符串转换回 Date 对象
      return parsed.map((script: any) => ({
        ...script,
        createdAt: script.createdAt ? new Date(script.createdAt) : new Date(),
      }))
    } catch (error) {
      console.error('加载本地剧本数据失败:', error)
      return []
    }
  }

  // 保存剧本数据到 localStorage
  const saveScriptsToStorage = (scriptsToSave: Script[]) => {
    if (typeof window === 'undefined') return
    
    try {
      // 将 Date 对象转换为字符串以便存储
      const serialized = scriptsToSave.map(script => ({
        ...script,
        createdAt: script.createdAt instanceof Date 
          ? script.createdAt.toISOString() 
          : typeof script.createdAt === 'string' 
            ? script.createdAt 
            : new Date().toISOString(),
      }))
      localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(serialized))
    } catch (error) {
      console.error('保存剧本数据到本地存储失败:', error)
    }
  }

  // 初始化剧本数据：优先从 localStorage 加载，如果没有则使用默认数据
  const [scripts, setScripts] = useState<Script[]>(() => {
    const loadedScripts = loadScriptsFromStorage()
    if (loadedScripts.length > 0) {
      return loadedScripts
    }
    // 如果没有本地数据，使用默认数据
    return [
      {
        id: 'script-1',
        title: '赛博剑客的觉醒',
        author: 'AI Writer',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        scenes: [
          {
            sceneNumber: 1,
            content: '赛博剑客站在霓虹街头，雨水从空中落下，反射着五彩斑斓的霓虹灯光',
            dialogue: '在这个数字化的世界里，每个人都在寻找自己的真相。',
            vfx_suggestion: '推镜头，从远景逐渐推进到角色特写，配合雨滴特效',
            duration: 5.0
          },
          {
            sceneNumber: 2,
            content: '地下实验室，多个屏幕闪烁着代码，AI 少女的投影出现',
            dialogue: '你终于来了，我一直在等你。',
            vfx_suggestion: '低头视角，从上方俯视，营造神秘感',
            duration: 4.5
          }
        ]
      },
      {
        id: 'script-2',
        title: '未来都市传说',
        author: 'Creative AI',
        createdAt: new Date('2024-01-20T14:30:00Z'),
        scenes: [
          {
            sceneNumber: 1,
            content: '未来都市的空中走廊，悬浮车辆穿梭而过',
            dialogue: '欢迎来到 2089 年，这里是新东京。',
            vfx_suggestion: '环绕镜头，展示城市全貌',
            duration: 6.0
          }
        ]
      }
    ]
  })
  const [selectedScript, setSelectedScript] = useState<Script | null>(null)
  const [scriptSearchQuery, setScriptSearchQuery] = useState('')
  const [isCreatingScript, setIsCreatingScript] = useState(false)
  const [newScriptTitle, setNewScriptTitle] = useState('')
  const [newScriptAuthor, setNewScriptAuthor] = useState('')
  
  // AI 生成相关状态
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [regeneratingSceneIndex, setRegeneratingSceneIndex] = useState<number | null>(null)
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null)
  
  // 批量生成分镜相关状态
  const [isBatchGenerating, setIsBatchGenerating] = useState(false)
  const [sceneGenerationProgress, setSceneGenerationProgress] = useState<Record<number, number>>({})

  // 自动保存剧本数据到 localStorage
  // 监听 scripts 变化，自动保存到 localStorage
  useEffect(() => {
    // 只在 scripts 有内容时保存（避免空数组覆盖已有数据）
    if (scripts.length > 0) {
      saveScriptsToStorage(scripts)
    }
  }, [scripts])

  // AI 生成场景
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !selectedScript || isGenerating) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '生成失败，请稍后重试')
      }

      const data = await response.json()
      const generatedScenes: Scene[] = data.scenes || []

      if (generatedScenes.length === 0) {
        throw new Error('未生成任何场景，请重试')
      }

      // 计算新的场景编号（从当前场景数量 + 1 开始）
      const startSceneNumber = selectedScript.scenes.length + 1
      const newScenes = generatedScenes.map((scene, index) => ({
        ...scene,
        sceneNumber: startSceneNumber + index,
      }))

      // 添加到当前剧本
      const updatedScript = {
        ...selectedScript,
        scenes: [...selectedScript.scenes, ...newScenes],
      }
      setSelectedScript(updatedScript)
      
      // 同步更新到 scripts 数组
      setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))

      // 清空输入框
      setAiPrompt('')

      // 显示成功提示
      alert(`成功生成 ${newScenes.length} 个场景！`)
    } catch (error: any) {
      console.error('AI 生成失败:', error)
      alert(error.message || '生成失败，请检查 API 配置或稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }

  // 重新生成单个场景
  const handleRegenerateScene = async (sceneIndex: number) => {
    if (!selectedScript || regeneratingSceneIndex !== null) return

    const scene = selectedScript.scenes[sceneIndex]
    if (!scene) return

    setRegeneratingSceneIndex(sceneIndex)
    try {
      // 使用当前场景的内容作为提示词
      const prompt = `场景描述：${scene.content}\n对白：${scene.dialogue}`
      
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          singleScene: true, // 只生成单个场景
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '生成失败，请稍后重试')
      }

      const data = await response.json()
      const generatedScenes: Scene[] = data.scenes || []

      if (generatedScenes.length === 0) {
        throw new Error('未生成任何场景，请重试')
      }

      // 使用生成的第一个场景替换当前场景（保持场景编号不变）
      const newScene = generatedScenes[0]
      const updatedScenes = [...selectedScript.scenes]
      updatedScenes[sceneIndex] = {
        ...newScene,
        sceneNumber: scene.sceneNumber, // 保持原有场景编号
      }

      const updatedScript = {
        ...selectedScript,
        scenes: updatedScenes,
      }
      setSelectedScript(updatedScript)
      
      // 同步更新到 scripts 数组
      setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))

      alert('场景重新生成成功！')
    } catch (error: any) {
      console.error('重新生成场景失败:', error)
      alert(error.message || '重新生成失败，请稍后重试')
    } finally {
      setRegeneratingSceneIndex(null)
    }
  }

  // 保存并显示通知
  const handleSave = () => {
    if (selectedCharacter) {
      // 更新assets数组中的角色数据
      setAssets(prevAssets => 
        prevAssets.map(asset => 
          asset.id === selectedCharacter.id
            ? {
                ...asset,
                prompt: editingPrompt,
                voiceModel: editingVoiceModel,
                speed: editingSpeed,
                emotion: editingEmotion
              }
            : asset
        )
      )
      
      // 更新当前选中的角色
      setSelectedCharacter({
        ...selectedCharacter,
        prompt: editingPrompt,
        voiceModel: editingVoiceModel,
        speed: editingSpeed,
        emotion: editingEmotion
      })
    }
    
    setShowSaveNotification(true)
    setTimeout(() => {
      setShowSaveNotification(false)
    }, 3000)
  }

  // 初始化语音列表
  useEffect(() => {
    // 确保语音列表已加载
    if (window.speechSynthesis && window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        // 语音列表已加载
      }
    }
  }, [])

  // 组件卸载时停止所有语音播放
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // TTS 试听函数 - 使用 Web Speech API
  const handlePlayTTS = () => {
    if (!selectedCharacter) return

    // 检查浏览器是否支持 Web Speech API
    if (!window.speechSynthesis) {
      console.warn('Web Speech API not supported, falling back to HTML5 Audio')
      fallbackToAudio()
      return
    }

    // 停止当前播放
    window.speechSynthesis.cancel()

    setIsPlayingAudio(true)

    // 创建语音合成对象
    const utterance = new SpeechSynthesisUtterance()
    
    // 设置要朗读的文本（可以根据角色名称生成示例文本）
    const sampleText = `你好，我是${selectedCharacter.name}，这是一段语音试听示例。当前语速为${editingSpeed}%，情感强度为${editingEmotion}%。`
    utterance.text = sampleText
    
    // 设置语速（0.1 到 10，默认 1）
    // 将 0-100 的滑块值转换为 0.5-2.0 的语速范围
    utterance.rate = 0.5 + (editingSpeed / 100) * 1.5
    
    // 设置音调（0 到 2，默认 1）
    // 将 0-100 的情感强度转换为 0.8-1.5 的音调范围
    utterance.pitch = 0.8 + (editingEmotion / 100) * 0.7
    
    // 设置音量（0 到 1，默认 1）
    utterance.volume = 1
    
    // 设置语言
    utterance.lang = 'zh-CN'
    
    // 获取可用语音列表
    const getVoices = () => {
      return window.speechSynthesis.getVoices()
    }
    
    // 选择合适语音的函数
    const selectVoice = (utt: SpeechSynthesisUtterance, voiceList: SpeechSynthesisVoice[]) => {
      let selectedVoice: SpeechSynthesisVoice | undefined = undefined
      
      if (editingVoiceModel === 'deep') {
        // 寻找低沉的男声
        selectedVoice = voiceList.find(v => 
          v.lang.includes('zh') && (
            v.name.includes('Male') || 
            v.name.includes('男') || 
            v.name.toLowerCase().includes('deep') ||
            v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('zh-cn-male')
          )
        ) || voiceList.find(v => v.lang.includes('zh-CN') && v.name.toLowerCase().includes('male'))
      } else if (editingVoiceModel === 'sweet') {
        // 寻找甜美的女声
        selectedVoice = voiceList.find(v => 
          v.lang.includes('zh') && (
            v.name.includes('Female') || 
            v.name.includes('女') || 
            v.name.toLowerCase().includes('sweet') ||
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zh-cn-female')
          )
        ) || voiceList.find(v => v.lang.includes('zh-CN') && v.name.toLowerCase().includes('female'))
      } else if (editingVoiceModel === 'mechanical') {
        // 寻找机械感的声音
        selectedVoice = voiceList.find(v => 
          v.lang.includes('zh') && (
            v.name.toLowerCase().includes('robot') || 
            v.name.toLowerCase().includes('mechanical') ||
            v.name.toLowerCase().includes('synthetic')
          )
        )
      }
      
      // 如果没有找到特定语音，使用默认中文语音
      if (!selectedVoice) {
        selectedVoice = voiceList.find(v => v.lang.includes('zh-CN')) || 
                       voiceList.find(v => v.lang.includes('zh'))
      }
      
      if (selectedVoice) {
        utt.voice = selectedVoice
      }
    }
    
    let voices = getVoices()
    
    // 如果语音列表为空，等待加载
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = getVoices()
        if (voices.length > 0) {
          selectVoice(utterance, voices)
          window.speechSynthesis.speak(utterance)
        }
      }
    } else {
      selectVoice(utterance, voices)
      window.speechSynthesis.speak(utterance)
    }
    
    // 播放完成和错误处理
    utterance.onend = () => {
      setIsPlayingAudio(false)
    }
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      setIsPlayingAudio(false)
      // 如果 Web Speech API 失败，尝试使用 HTML5 Audio 作为备选
      fallbackToAudio()
    }
  }

  // 备选方案：使用 HTML5 Audio 播放远程 MP3
  const fallbackToAudio = () => {
    setIsPlayingAudio(true)
    
    // 使用一个公开的示例音频 URL（可以替换为实际的 TTS 服务 URL）
    // 注意：这是一个示例 URL，实际使用时应该替换为真实的 TTS 服务端点
    const audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    
    const audio = new Audio(audioUrl)
    audio.volume = 0.7
    
    audio.onended = () => {
      setIsPlayingAudio(false)
    }
    
    audio.onerror = () => {
      console.error('Audio playback error')
      setIsPlayingAudio(false)
      alert('音频播放失败，请检查网络连接或浏览器支持')
    }
    
    audio.play().catch(error => {
      console.error('Audio play error:', error)
      setIsPlayingAudio(false)
      alert('无法播放音频，请检查浏览器权限设置')
    })
  }

  // AI 深度解析函数
  const handleAnalyze = () => {
    if (!storyText.trim()) {
      alert('请先输入故事内容')
      return
    }

    setIsAnalyzing(true)
    setProgress(0)
    setAnalysisResult(null)

    // 模拟进度条
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 300)

    // 3秒后显示结果
    setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      
      // 模拟解析结果
      const mockResult: AnalysisResult = {
        coreAssets: {
          characters: ['赛博剑客', 'AI 少女', '神秘黑客'],
          scenes: ['霓虹街头', '地下实验室', '虚拟空间']
        },
        scriptOutline: {
          chapters: [
            {
              title: '第一章：觉醒',
              description: '赛博剑客在霓虹街头发现异常信号，开始追踪神秘来源。'
            },
            {
              title: '第二章：探索',
              description: '深入地下实验室，遭遇 AI 少女，揭开隐藏的真相。'
            },
            {
              title: '第三章：决战',
              description: '在虚拟空间中与神秘黑客展开最终对决，拯救数字世界。'
            }
          ]
        }
      }
      
      setAnalysisResult(mockResult)
      setIsAnalyzing(false)
      
      // 将解析出的角色添加到资产中心
      const newCharacters: CharacterAsset[] = mockResult.coreAssets.characters.map((charName, index) => {
        // 检查是否已存在同名角色
        const existingChar = assets.find(a => a.name === charName)
        if (existingChar) {
          return existingChar
        }
        
        // 创建新角色
        return {
          id: `new-${Date.now()}-${index}`,
          name: charName,
          prompt: `A detailed character design for ${charName}, high quality, professional`,
          voiceModel: 'cold-male', // 默认音色
          speed: 50,
          emotion: 70,
          status: 'pending' // 新解析的角色默认为待更新状态
        }
      })
      
      // 合并新角色到现有资产列表（去重）
      setAssets(prevAssets => {
        const existingNames = new Set(prevAssets.map(a => a.name))
        const uniqueNewChars = newCharacters.filter(char => !existingNames.has(char.name))
        return [...prevAssets, ...uniqueNewChars]
      })
    }, 3000)
  }

  return (
    <div className="flex h-screen bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden">
      {/* 侧边栏导航 - Apple 风格 */}
      <aside className="w-64 border-r border-[#E5E5E7] backdrop-blur-xl bg-[#FFFFFF] flex flex-col p-4 space-y-2 shadow-apple">
        <div className="text-xl font-bold mb-8 px-4 flex items-center gap-2 text-[#1D1D1F]">
          <div className="w-8 h-8 bg-cyan-500 rounded-apple-md flex items-center justify-center text-white backdrop-blur-sm shadow-apple">AI</div>
          <span>Video Lab</span>
        </div>
        
        <nav className="flex-1">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-apple-lg transition-all backdrop-blur-sm ${
                currentStep === step.id 
                ? 'bg-cyan-500/10 text-cyan-600 border border-[#E5E5E7] shadow-apple-cyan' 
                : 'text-[#86868B] hover:bg-[#F5F5F7] border border-transparent'
              }`}
            >
              {step.icon}
              <span className="font-medium">{step.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 主操作区 - Apple 风格 */}
      <main className="flex-1 relative flex flex-col p-8 backdrop-blur-xl overflow-hidden bg-[#FFFFFF] text-[#1D1D1F]">
        {currentStep === 'overview' && (
          <div className="max-w-6xl mx-auto w-full space-y-8">
            {/* 标题区域 */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight text-[#1D1D1F]">开启你的 AI 创意之旅</h1>
              <p className="text-[#86868B] text-lg">从故事脚本到全片预览，一站式生成高品质 AI 视频</p>
            </div>

            {/* 背景设置区域 */}
            <div className="backdrop-blur-xl bg-[#FFFFFF] rounded-apple-xl border border-[#E5E5E7] p-8 shadow-apple-lg">
              <h2 className="text-2xl font-bold text-[#1D1D1F] mb-6">背景设置</h2>
              
              {/* 预设艺术风格库 */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-cyan-500 rounded"></span>
                  预设艺术风格库
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {artStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedArtStyle(style.id === selectedArtStyle ? null : style.id)}
                      className={`px-4 py-3 rounded-xl font-medium text-sm transition-all border-2 backdrop-blur-sm ${
                        selectedArtStyle === style.id
                          ? `${style.color} border-current shadow-md scale-105`
                          : `${style.color} border-transparent hover:scale-102 hover:shadow-sm`
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 文化背景标签 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-cyan-500 rounded"></span>
                  文化背景标签
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {culturalBackgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedCulturalBg(bg.id === selectedCulturalBg ? null : bg.id)}
                      className={`px-4 py-3 rounded-xl font-medium text-sm transition-all border-2 backdrop-blur-sm ${
                        selectedCulturalBg === bg.id
                          ? `${bg.color} border-current shadow-md scale-105`
                          : `${bg.color} border-transparent hover:scale-102 hover:shadow-sm`
                      }`}
                    >
                      {bg.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 当前选择显示 */}
              {(selectedArtStyle || selectedCulturalBg) && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-300/50">
                  <p className="text-sm font-medium text-gray-700 mb-2">当前选择：</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtStyle && (
                      <span className="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-medium border border-cyan-300">
                        {artStyles.find(s => s.id === selectedArtStyle)?.name}
                      </span>
                    )}
                    {selectedCulturalBg && (
                      <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium border border-purple-300">
                        {culturalBackgrounds.find(b => b.id === selectedCulturalBg)?.name}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 创建项目按钮 */}
            <div className="text-center">
              <Button
                onClick={() => setIsModalOpen(true)}
                variant="primary"
                size="lg"
                icon={Plus}
                className="mx-auto"
              >
                创建新项目
              </Button>
            </div>
          </div>
        )}

        {/* 故事改编界面 */}
        {currentStep === 'story' && (
          <div className="flex h-full gap-6">
            {/* 左侧：故事输入区 - Apple 风格 */}
            <Card className="flex-1 flex flex-col" padding="md">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2">故事内容</h2>
                <p className="text-sm text-[#86868B]">粘贴或输入您的故事文本</p>
              </div>
              <Textarea
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder="在此粘贴您的故事内容..."
                className="flex-1 min-h-[300px]"
              />
              <div className="mt-4 space-y-3">
                <Button
                  onClick={handleAdaptStory}
                  disabled={isAnalyzing || !storyText.trim()}
                  variant="primary"
                  size="md"
                  icon={Sparkles}
                  fullWidth
                >
                  {isAnalyzing ? 'AI 改编中...' : '开始故事改编'}
                </Button>
              </div>
              
              {/* 进度条 - Apple 风格 */}
              {isAnalyzing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#1D1D1F]">解析进度</span>
                    <span className="text-sm text-[#86868B]">{progress}%</span>
                  </div>
                  <div className="w-full bg-[#F5F5F7] rounded-full h-2.5 overflow-hidden border border-[#E5E5E5]">
                    <div
                      className="bg-[#000000] h-2.5 rounded-full transition-all duration-300 ease-out shadow-apple"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* 右侧：AI 解析预览区 - Apple 风格 */}
            <Card className="flex-1 flex flex-col overflow-y-auto" padding="md">
              <h2 className="text-2xl font-bold text-[#1D1D1F] mb-4">AI 解析结果</h2>
              
              {!analysisResult && !storyAdaptation && !isAnalyzing && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Sparkles size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-lg text-gray-600">等待 AI 解析...</p>
                    <p className="text-sm mt-2 text-gray-500">输入故事内容后点击"开始故事改编"</p>
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-700">AI 正在改编故事内容...</p>
                  </div>
                </div>
              )}

              {/* 故事改编结果 */}
              {storyAdaptation && (
                <div className="space-y-6 mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-6 bg-purple-500 rounded"></span>
                    改编后的故事大纲
                  </h3>
                  
                  {/* 故事大纲 */}
                  <Card className="bg-purple-50/50 border-purple-200" padding="sm">
                    <h4 className="text-sm font-semibold text-purple-700 mb-2">故事大纲</h4>
                    <p className="text-[#1D1D1F] whitespace-pre-wrap">{storyAdaptation.story_outline}</p>
                  </Card>

                  {/* 视觉基调 */}
                  <Card className="bg-indigo-50/50 border-indigo-200" padding="sm">
                    <h4 className="text-sm font-semibold text-indigo-700 mb-2">视觉基调</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-indigo-600 font-medium">视觉风格：</span>
                        <p className="text-[#1D1D1F] font-medium">
                          {typeof storyAdaptation.assets.theme === 'object' 
                            ? storyAdaptation.assets.theme.visual_style 
                            : storyAdaptation.assets.theme}
                        </p>
                      </div>
                      {typeof storyAdaptation.assets.theme === 'object' && storyAdaptation.assets.theme.color_palette && (
                        <div>
                          <span className="text-xs text-indigo-600 font-medium">色彩调色板：</span>
                          <p className="text-[#86868B] text-sm">{storyAdaptation.assets.theme.color_palette}</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* 角色清单 */}
                  {storyAdaptation.assets.characters.length > 0 && (
                    <Card className="bg-cyan-50/50 border-cyan-200" padding="sm">
                      <h4 className="text-sm font-semibold text-cyan-700 mb-3">角色清单</h4>
                      <div className="space-y-3">
                        {storyAdaptation.assets.characters.map((character, index) => (
                          <Card key={index} className="bg-white/50 border-cyan-200/50" padding="sm">
                            <h5 className="text-xs font-bold text-cyan-800 mb-1">{character.name}</h5>
                            <p className="text-xs text-[#86868B]">{character.description}</p>
                          </Card>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* 道具清单 */}
                  {storyAdaptation.assets.props.length > 0 && (
                    <Card className="bg-amber-50/50 border-amber-200" padding="sm">
                      <h4 className="text-sm font-semibold text-amber-700 mb-3">道具清单</h4>
                      <div className="space-y-3">
                        {storyAdaptation.assets.props.map((prop, index) => (
                          <Card key={index} className="bg-white/50 border-amber-200/50" padding="sm">
                            <h5 className="text-xs font-bold text-amber-800 mb-1">{prop.name}</h5>
                            <p className="text-xs text-[#86868B]">{prop.description || (prop as any).visualDetails || ''}</p>
                          </Card>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* 场景清单 */}
                  {storyAdaptation.assets.scenes.length > 0 && (
                    <Card className="bg-green-50/50 border-green-200" padding="sm">
                      <h4 className="text-sm font-semibold text-green-700 mb-3">场景清单</h4>
                      <div className="space-y-3">
                        {storyAdaptation.assets.scenes.map((scene, index) => (
                          <Card key={index} className="bg-white/50 border-green-200/50" padding="sm">
                            <h5 className="text-xs font-bold text-green-800 mb-1">{scene.name}</h5>
                            <p className="text-xs text-[#86868B]">{scene.description}</p>
                          </Card>
                        ))}
                      </div>
                    </Card>
                  )}
                  
                  {/* 生成剧本按钮和进度条 */}
                  <div className="mt-6 space-y-4">
                    {/* 进度条 */}
                    {isGeneratingScript && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 font-medium">正在生成剧本...</span>
                          <span className="text-gray-600">{Math.round(scriptGenerationProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden border border-gray-300/50">
                          <div
                            className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 h-3 rounded-full transition-all duration-300 ease-out shadow-lg relative overflow-hidden"
                            style={{ width: `${scriptGenerationProgress}%` }}
                          >
                            {/* 流光效果 */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">AI 正在分析故事大纲并生成分场景剧本，请稍候...</p>
                      </div>
                    )}

                    {/* 错误提示 */}
                    {scriptGenerationError && !isGeneratingScript && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <X className="text-red-500" size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-red-800 mb-1">生成失败</h4>
                            <p className="text-sm text-red-700">{scriptGenerationError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 生成按钮 */}
                    <Button
                      onClick={() => handleConfirmAdaptationAndGenerate()}
                      disabled={isGeneratingScript}
                      variant="primary"
                      size="md"
                      fullWidth
                      icon={isGeneratingScript ? Loader2 : scriptGenerationError ? RefreshCw : ScrollText}
                      className={isGeneratingScript ? 'opacity-50' : ''}
                    >
                      {isGeneratingScript ? (
                        '正在生成剧本...'
                      ) : scriptGenerationError ? (
                        '重试生成'
                      ) : (
                        '生成详细剧本'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-6">
                  {/* 核心资产 */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="w-1 h-6 bg-cyan-500 rounded"></span>
                      核心资产
                    </h3>
                    
                    {/* 角色 */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">角色</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.coreAssets.characters.map((character, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-cyan-50 backdrop-blur-sm text-cyan-700 rounded-lg text-sm font-medium border border-gray-300/50 shadow-sm"
                          >
                            {character}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 场景 */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">场景</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.coreAssets.scenes.map((scene, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-purple-50 backdrop-blur-sm text-purple-700 rounded-lg text-sm font-medium border border-gray-300/50 shadow-sm"
                          >
                            {scene}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 剧本大纲 */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="w-1 h-6 bg-cyan-500 rounded"></span>
                      剧本大纲
                    </h3>
                    <div className="space-y-3">
                      {analysisResult.scriptOutline.chapters.map((chapter, index) => (
                        <div
                          key={index}
                          className="p-4 bg-gray-50 backdrop-blur-sm rounded-lg border border-gray-300/50 hover:border-cyan-300 transition-all shadow-sm hover:shadow-md"
                        >
                          <h4 className="font-semibold text-gray-800 mb-1">{chapter.title}</h4>
                          <p className="text-sm text-gray-600">{chapter.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* JSON 数据预览 */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="w-1 h-6 bg-cyan-500 rounded"></span>
                      原始数据 (JSON)
                    </h3>
                    <pre className="p-4 bg-gray-100 backdrop-blur-sm text-gray-800 rounded-lg text-xs overflow-x-auto border border-gray-300/50 shadow-inner">
                      {JSON.stringify(analysisResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* 资产中心界面 - 浅色模式 */}
        {currentStep === 'assets' && (
          <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white text-gray-900">
            {/* 资产分类导航 */}
            <div className="flex gap-2 p-4 border-b border-gray-300/50 bg-white/80 backdrop-blur-sm">
              <button
                onClick={() => {
                  setAssetTab('character')
                  setEditingAssetId(null)
                  setEditingAssetType(null)
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  assetTab === 'character'
                    ? 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                }`}
              >
                <User size={18} />
                角色
              </button>
              <button
                onClick={() => {
                  setAssetTab('prop')
                  setEditingAssetId(null)
                  setEditingAssetType(null)
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  assetTab === 'prop'
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                }`}
              >
                <Box size={18} />
                道具
              </button>
              <button
                onClick={() => {
                  setAssetTab('scene')
                  setEditingAssetId(null)
                  setEditingAssetType(null)
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  assetTab === 'scene'
                    ? 'bg-green-500/10 text-green-600 border border-green-500/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                }`}
              >
                <MapPin size={18} />
                场景
              </button>
              <button
                onClick={() => {
                  setAssetTab('settings')
                  setEditingAssetId(null)
                  setEditingAssetType(null)
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  assetTab === 'settings'
                    ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                }`}
              >
                <Save size={18} />
                全局设置
              </button>
            </div>

            {/* 主内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 角色 Tab */}
              {assetTab === 'character' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">角色资产</h2>
                    <p className="text-sm text-gray-600">管理故事中的角色设定和外观描述</p>
                  </div>
                  
                  {storeCharacters.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      <div className="text-center">
                        <User size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">暂无角色资产</p>
                        <p className="text-sm mt-2">在"故事改编"页面完成改编后，角色会自动添加到这里</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {storeCharacters.map((character) => (
                        <Card
                          key={character.id}
                          className="hover:shadow-apple-lg transition-all cursor-pointer"
                          padding="lg"
                        >
                          {/* 参考图 */}
                          {(() => {
                            // 从统一的 assets 数组中查找对应的资产，获取 referenceImageUrl
                            const store = useAssetStore.getState()
                            const assets = store.getAssetsByCategory(AssetCategory.CHARACTER)
                            const asset = assets.find(a => a.name === character.name)
                            const imageUrl = asset?.referenceImageUrl
                            
                            return (
                              <div className="w-full aspect-square rounded-apple-lg mb-4 border border-[#E5E5E5] relative group overflow-hidden bg-gradient-to-br from-cyan-100 to-purple-100">
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={character.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <>
                                    <Image size={48} className="text-[#86868B] absolute inset-0 m-auto" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all rounded-apple-lg flex items-center justify-center">
                                      <span className="text-xs text-[#86868B] opacity-0 group-hover:opacity-100 transition-opacity">
                                        点击生成参考图
                                      </span>
                                    </div>
                                  </>
                                )}
                                {generatingImageId === character.id && (
                                  <div className="absolute inset-0 backdrop-blur-md bg-white/70 border border-white/50 flex flex-col items-center justify-center rounded-apple-lg shadow-apple-lg z-10">
                                    <Loader2 size={32} className="text-[#1D1D1F] animate-spin mb-2" />
                                    <span className="text-sm font-medium text-[#1D1D1F]">生成中 {Math.round(generatingImageProgress)}%</span>
                                    <div className="mt-2 w-32 h-1 bg-[#E5E5E5] rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-[#007AFF] transition-all duration-300 rounded-full"
                                        style={{ width: `${generatingImageProgress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                          
                          {/* 角色名称 */}
                          <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">
                            {editingAssetId === character.id && editingAssetType === 'character' ? (
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="text-lg font-bold"
                                autoFocus
                              />
                            ) : (
                              character.name
                            )}
                          </h3>
                          
                          {/* 角色描述 */}
                          <div className="mb-4">
                            {editingAssetId === character.id && editingAssetType === 'character' ? (
                              <Textarea
                                value={editingDescription}
                                onChange={(e) => setEditingDescription(e.target.value)}
                                className="text-sm"
                                rows={3}
                                placeholder="输入角色描述..."
                              />
                            ) : (
                              <p className="text-sm text-[#86868B] line-clamp-3">{character.description}</p>
                            )}
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="flex flex-col gap-2">
                            {editingAssetId === character.id && editingAssetType === 'character' ? (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    updateCharacter(character.id, {
                                      name: editingName,
                                      description: editingDescription,
                                    })
                                    setEditingAssetId(null)
                                    setEditingAssetType(null)
                                  }}
                                  variant="primary"
                                  size="sm"
                                  icon={Save}
                                  className="flex-1"
                                >
                                  保存
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingAssetId(null)
                                    setEditingAssetType(null)
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  icon={X}
                                  aria-label="取消"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => {
                                      setEditingAssetId(character.id)
                                      setEditingAssetType('character')
                                      setEditingName(character.name)
                                      setEditingDescription(character.description)
                                    }}
                                    variant="secondary"
                                    size="sm"
                                    icon={Edit3}
                                    className="flex-1"
                                  >
                                    编辑
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      if (confirm(`确定要删除角色"${character.name}"吗？`)) {
                                        removeCharacter(character.id)
                                      }
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    icon={Trash2}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    aria-label="删除"
                                  />
                                </div>
                                <Button
                                  onClick={() => handleGenerateAssetImage(character.id, character.description, 'character')}
                                  disabled={generatingImageId === character.id || !character.description.trim()}
                                  variant="primary"
                                  size="sm"
                                  icon={generatingImageId === character.id ? Loader2 : Sparkles}
                                  fullWidth
                                  className={generatingImageId === character.id ? 'opacity-50' : ''}
                                >
                                  {generatingImageId === character.id ? '生成中...' : '生成形象'}
                                </Button>
                              </>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 道具 Tab */}
              {assetTab === 'prop' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">道具资产</h2>
                    <p className="text-sm text-gray-600">管理故事中的关键道具及其视觉细节</p>
                  </div>
                  
                  {storeProps.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      <div className="text-center">
                        <Box size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">暂无道具资产</p>
                        <p className="text-sm mt-2">在"故事改编"页面完成改编后，道具会自动添加到这里</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {storeProps.map((prop) => (
                        <Card
                          key={prop.id}
                          className="hover:shadow-apple-lg transition-all cursor-pointer"
                          padding="lg"
                        >
                          {/* 参考图 */}
                          {(() => {
                            const store = useAssetStore.getState()
                            const assets = store.getAssetsByCategory(AssetCategory.PROP)
                            const asset = assets.find(a => a.name === prop.name)
                            const imageUrl = asset?.referenceImageUrl
                            
                            return (
                              <div className="w-full aspect-square rounded-apple-lg mb-4 border border-[#E5E5E5] relative group overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={prop.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <>
                                    <Box size={48} className="text-[#86868B] absolute inset-0 m-auto" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all rounded-apple-lg flex items-center justify-center">
                                      <span className="text-xs text-[#86868B] opacity-0 group-hover:opacity-100 transition-opacity">
                                        点击生成参考图
                                      </span>
                                    </div>
                                  </>
                                )}
                                {generatingImageId === prop.id && (
                                  <div className="absolute inset-0 backdrop-blur-md bg-white/70 border border-white/50 flex flex-col items-center justify-center rounded-apple-lg shadow-apple-lg z-10">
                                    <Loader2 size={32} className="text-[#1D1D1F] animate-spin mb-2" />
                                    <span className="text-sm font-medium text-[#1D1D1F]">生成中 {Math.round(generatingImageProgress)}%</span>
                                    <div className="mt-2 w-32 h-1 bg-[#E5E5E5] rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-[#007AFF] transition-all duration-300 rounded-full"
                                        style={{ width: `${generatingImageProgress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                          
                          {/* 道具名称 */}
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {editingAssetId === prop.id && editingAssetType === 'prop' ? (
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-lg font-bold"
                                autoFocus
                              />
                            ) : (
                              prop.name
                            )}
                          </h3>
                          
                          {/* 道具名称 */}
                          <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">
                            {editingAssetId === prop.id && editingAssetType === 'prop' ? (
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="text-lg font-bold"
                                autoFocus
                              />
                            ) : (
                              prop.name
                            )}
                          </h3>
                          
                          {/* 道具视觉细节 */}
                          <div className="mb-4">
                            {editingAssetId === prop.id && editingAssetType === 'prop' ? (
                              <Textarea
                                value={editingDescription}
                                onChange={(e) => setEditingDescription(e.target.value)}
                                className="text-sm"
                                rows={3}
                                placeholder="输入道具的视觉细节..."
                              />
                            ) : (
                              <p className="text-sm text-[#86868B] line-clamp-3">{prop.visualDetails}</p>
                            )}
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="flex flex-col gap-2">
                            {editingAssetId === prop.id && editingAssetType === 'prop' ? (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    updateProp(prop.id, {
                                      name: editingName,
                                      visualDetails: editingDescription,
                                    })
                                    setEditingAssetId(null)
                                    setEditingAssetType(null)
                                  }}
                                  variant="primary"
                                  size="sm"
                                  icon={Save}
                                  className="flex-1"
                                >
                                  保存
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingAssetId(null)
                                    setEditingAssetType(null)
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  icon={X}
                                  aria-label="取消"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => {
                                      setEditingAssetId(prop.id)
                                      setEditingAssetType('prop')
                                      setEditingName(prop.name)
                                      setEditingDescription(prop.visualDetails)
                                    }}
                                    variant="secondary"
                                    size="sm"
                                    icon={Edit3}
                                    className="flex-1"
                                  >
                                    编辑
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      if (confirm(`确定要删除道具"${prop.name}"吗？`)) {
                                        removeProp(prop.id)
                                      }
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    icon={Trash2}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    aria-label="删除"
                                  />
                                </div>
                                <Button
                                  onClick={() => handleGenerateAssetImage(prop.id, prop.visualDetails, 'prop')}
                                  disabled={generatingImageId === prop.id || !prop.visualDetails.trim()}
                                  variant="primary"
                                  size="sm"
                                  icon={generatingImageId === prop.id ? Loader2 : Sparkles}
                                  fullWidth
                                  className={generatingImageId === prop.id ? 'opacity-50' : ''}
                                >
                                  {generatingImageId === prop.id ? '生成中...' : '生成形象'}
                                </Button>
                              </>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 场景 Tab */}
              {assetTab === 'scene' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">场景资产</h2>
                    <p className="text-sm text-gray-600">管理故事中的核心场景及其环境描述</p>
                  </div>
                  
                  {storeScenes.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      <div className="text-center">
                        <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">暂无场景资产</p>
                        <p className="text-sm mt-2">在"故事改编"页面完成改编后，场景会自动添加到这里</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {storeScenes.map((scene) => (
                        <Card
                          key={scene.id}
                          className="hover:shadow-apple-lg transition-all cursor-pointer"
                          padding="lg"
                        >
                          {/* 参考图 */}
                          {(() => {
                            const store = useAssetStore.getState()
                            const assets = store.getAssetsByCategory(AssetCategory.SCENE)
                            const asset = assets.find(a => a.name === scene.name)
                            const imageUrl = asset?.referenceImageUrl
                            
                            return (
                              <div className="w-full aspect-square rounded-apple-lg mb-4 border border-[#E5E5E5] relative group overflow-hidden bg-gradient-to-br from-green-100 to-emerald-100">
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={scene.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <>
                                    <MapPin size={48} className="text-[#86868B] absolute inset-0 m-auto" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all rounded-apple-lg flex items-center justify-center">
                                      <span className="text-xs text-[#86868B] opacity-0 group-hover:opacity-100 transition-opacity">
                                        点击生成参考图
                                      </span>
                                    </div>
                                  </>
                                )}
                                {generatingImageId === scene.id && (
                                  <div className="absolute inset-0 backdrop-blur-md bg-white/70 border border-white/50 flex flex-col items-center justify-center rounded-apple-lg shadow-apple-lg z-10">
                                    <Loader2 size={32} className="text-[#1D1D1F] animate-spin mb-2" />
                                    <span className="text-sm font-medium text-[#1D1D1F]">生成中 {Math.round(generatingImageProgress)}%</span>
                                    <div className="mt-2 w-32 h-1 bg-[#E5E5E5] rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-[#007AFF] transition-all duration-300 rounded-full"
                                        style={{ width: `${generatingImageProgress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                          
                          {/* 场景名称 */}
                          <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">
                            {editingAssetId === scene.id && editingAssetType === 'scene' ? (
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="text-lg font-bold"
                                autoFocus
                              />
                            ) : (
                              scene.name
                            )}
                          </h3>
                          
                          {/* 场景描述 */}
                          <div className="mb-4">
                            {editingAssetId === scene.id && editingAssetType === 'scene' ? (
                              <Textarea
                                value={editingDescription}
                                onChange={(e) => setEditingDescription(e.target.value)}
                                className="text-sm"
                                rows={3}
                                placeholder="输入场景描述..."
                              />
                            ) : (
                              <p className="text-sm text-[#86868B] line-clamp-3">{scene.description}</p>
                            )}
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="flex flex-col gap-2">
                            {editingAssetId === scene.id && editingAssetType === 'scene' ? (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    updateScene(scene.id, {
                                      name: editingName,
                                      description: editingDescription,
                                    })
                                    setEditingAssetId(null)
                                    setEditingAssetType(null)
                                  }}
                                  variant="primary"
                                  size="sm"
                                  icon={Save}
                                  className="flex-1"
                                >
                                  保存
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingAssetId(null)
                                    setEditingAssetType(null)
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  icon={X}
                                  aria-label="取消"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => {
                                      setEditingAssetId(scene.id)
                                      setEditingAssetType('scene')
                                      setEditingName(scene.name)
                                      setEditingDescription(scene.description)
                                    }}
                                    variant="secondary"
                                    size="sm"
                                    icon={Edit3}
                                    className="flex-1"
                                  >
                                    编辑
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      if (confirm(`确定要删除场景"${scene.name}"吗？`)) {
                                        removeScene(scene.id)
                                      }
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    icon={Trash2}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    aria-label="删除"
                                  />
                                </div>
                                <Button
                                  onClick={() => handleGenerateAssetImage(scene.id, scene.description, 'scene')}
                                  disabled={generatingImageId === scene.id || !scene.description.trim()}
                                  variant="primary"
                                  size="sm"
                                  icon={generatingImageId === scene.id ? Loader2 : Sparkles}
                                  fullWidth
                                  className={generatingImageId === scene.id ? 'opacity-50' : ''}
                                >
                                  {generatingImageId === scene.id ? '生成中...' : '生成形象'}
                                </Button>
                              </>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 全局设置 Tab */}
              {assetTab === 'settings' && (
                <div className="max-w-2xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">全局设置</h2>
                    <p className="text-sm text-gray-600">管理项目的视觉基调和全局配置</p>
                  </div>
                  
                  <Card padding="lg">
                    <div className="mb-4">
                      <Input
                        type="text"
                        label="视觉基调"
                        value={storeTheme || ''}
                        onChange={(e) => setTheme(e.target.value)}
                        placeholder="例如：赛博朋克、极简主义、水墨风、3D粘土..."
                        helperText="这个视觉基调将应用于所有场景的图像生成"
                      />
                    </div>
                    
                    {storeTheme && (
                      <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-sm font-medium text-indigo-800 mb-1">当前视觉基调</p>
                        <p className="text-lg font-bold text-indigo-900">{storeTheme}</p>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 分镜管理界面 */}
        {currentStep === 'storyboard' && (
          <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-6 overflow-y-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">分镜管理</h1>
              <p className="text-gray-400">管理视频分镜，关联角色和场景，生成对白音频</p>
            </div>

            {/* 全局风格设定 */}
            <div className="mb-6 bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <SparklesIcon size={16} className="text-cyan-400" />
                    全局风格设定
                  </label>
                  <input
                    type="text"
                    value={globalStyle}
                    onChange={(e) => setGlobalStyle(e.target.value)}
                    placeholder="例如：赛博朋克风格、新海诚动画风、3D 粘土风格..."
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    此风格将自动应用到所有分镜图的生成中
                  </p>
                </div>
                {globalStyle && (
                  <button
                    onClick={() => setGlobalStyle('')}
                    className="px-4 py-2.5 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all text-sm"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* 六宫格布局 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {storyboards.map((storyboard) => {
                // 从assets数组读取最新的角色配置（确保数据一致性）
                const selectedCharacter = storyboard.characterId 
                  ? assets.find(a => a.id === storyboard.characterId)
                  : null
                const selectedScene = storyboard.sceneId
                  ? mockScenes.find(s => s.id === storyboard.sceneId)
                  : null
                
                // 获取当前角色的音色名称
                const currentVoiceName = selectedCharacter 
                  ? (voicePresets.find(v => v.id === selectedCharacter.voiceModel)?.name || selectedCharacter.voiceModel)
                  : null

                return (
                  <div
                    key={storyboard.id}
                    className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-xl"
                  >
                    {/* 预览图区域 */}
                    <div className="relative aspect-video bg-gradient-to-br from-cyan-900/30 to-purple-900/30 group">
                      {storyboard.imageUrl ? (
                        <img 
                          src={storyboard.imageUrl} 
                          alt="分镜预览" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image size={48} className="text-gray-500" />
                        </div>
                      )}
                      
                      {/* 重绘悬浮按钮 */}
                      <button
                        onClick={() => {
                          // 模拟重绘逻辑
                          setStoryboards(prev => 
                            prev.map(sb => 
                              sb.id === storyboard.id 
                                ? { ...sb, status: 'image-generated' as StoryboardStatus }
                                : sb
                            )
                          )
                        }}
                        className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <RefreshCw size={16} />
                      </button>

                      {/* 生成分镜按钮 - 当有对白、角色、场景时显示 */}
                      {!storyboard.imageUrl && storyboard.dialogue && storyboard.characterId && storyboard.sceneId && (
                        <button
                          onClick={() => {
                            const character = assets.find(a => a.id === storyboard.characterId)
                            const scene = mockScenes.find(s => s.id === storyboard.sceneId)
                            
                            if (!character || !scene) return

                            // 组合提示词：视觉描述 + 对白 + 角色提示词 + 场景提示词 + 全局风格
                            const visualDesc = storyboard.visualDescription || ''
                            // 使用 enhancePrompt 增强视觉描述
                            const enhancedVisualDesc = enhancePrompt(visualDesc)
                            // 构建基础提示词
                            let combinedPrompt = `${enhancedVisualDesc} ${storyboard.dialogue ? `. ${storyboard.dialogue}` : ''}. Character: ${character.prompt}. Scene: ${scene.prompt}. 16:9 aspect ratio`.trim()
                            // 如果有全局风格，追加到提示词末尾
                            if (globalStyle && globalStyle.trim()) {
                              combinedPrompt = `${combinedPrompt}, ${globalStyle.trim()}`
                            }

                            // 模拟生成分镜图（3秒）
                            setStoryboards(prev => 
                              prev.map(sb => 
                                sb.id === storyboard.id 
                                  ? { ...sb, status: 'waiting-render' as StoryboardStatus }
                                  : sb
                              )
                            )

                            setTimeout(() => {
                              // 生成完成后设置图片URL（这里使用占位图）
                              setStoryboards(prev => 
                                prev.map(sb => 
                                  sb.id === storyboard.id 
                                    ? { 
                                        ...sb, 
                                        imageUrl: `https://via.placeholder.com/1920x1080/1a1a2e/ffffff?text=分镜+${storyboard.id}`,
                                        status: 'image-generated' as StoryboardStatus
                                      }
                                    : sb
                                )
                              )
                            }, 3000)
                          }}
                          className="absolute bottom-2 left-2 px-4 py-2 bg-cyan-500/90 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-all backdrop-blur-sm"
                        >
                          生成分镜
                        </button>
                      )}
                    </div>

                    {/* 卡片内容区域 */}
                    <div className="p-4 space-y-4">
                      {/* 关联槽位 */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400">角色</label>
                        <select
                          value={storyboard.characterId || ''}
                          onChange={(e) => {
                            setStoryboards(prev => 
                              prev.map(sb => 
                                sb.id === storyboard.id 
                                  ? { ...sb, characterId: e.target.value || null }
                                  : sb
                              )
                            )
                          }}
                          className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                        >
                          <option value="">选择角色</option>
                          {assets.map(asset => (
                            <option key={asset.id} value={asset.id} className="bg-slate-800">
                              {asset.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400">场景</label>
                        <select
                          value={storyboard.sceneId || ''}
                          onChange={(e) => {
                            setStoryboards(prev => 
                              prev.map(sb => 
                                sb.id === storyboard.id 
                                  ? { ...sb, sceneId: e.target.value || null }
                                  : sb
                              )
                            )
                          }}
                          className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                        >
                          <option value="">选择场景</option>
                          {mockScenes.map(scene => (
                            <option key={scene.id} value={scene.id} className="bg-slate-800">
                              {scene.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 视觉描述（Prompt） */}
                      {storyboard.visualDescription && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
                            <Image size={14} />
                            视觉描述 (Prompt)
                          </label>
                          <div className="px-3 py-2 bg-slate-800/30 border border-cyan-500/30 rounded-lg text-white text-xs">
                            {storyboard.visualDescription}
                          </div>
                        </div>
                      )}

                      {/* 文本/对白区 */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400">对白</label>
                        {editingStoryboardId === storyboard.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingDialogue}
                              onChange={(e) => setEditingDialogue(e.target.value)}
                              onBlur={() => {
                                setStoryboards(prev => 
                                  prev.map(sb => 
                                    sb.id === storyboard.id 
                                      ? { ...sb, dialogue: editingDialogue }
                                      : sb
                                  )
                                )
                                setEditingStoryboardId(null)
                              }}
                              className="w-full px-3 py-2 bg-slate-800/50 border border-cyan-500/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                              rows={3}
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                setStoryboards(prev => 
                                  prev.map(sb => 
                                    sb.id === storyboard.id 
                                      ? { ...sb, dialogue: editingDialogue }
                                      : sb
                                  )
                                )
                                setEditingStoryboardId(null)
                              }}
                              className="w-full px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-all"
                            >
                              保存
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingStoryboardId(storyboard.id)
                              setEditingDialogue(storyboard.dialogue)
                            }}
                            className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm min-h-[60px] cursor-text hover:border-cyan-500/50 transition-all flex items-start gap-2"
                          >
                            <Edit3 size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="flex-1">{storyboard.dialogue}</span>
                          </div>
                        )}
                      </div>

                      {/* 合成语音按钮 */}
                      <button
                        onClick={() => {
                          if (!storyboard.characterId) {
                            alert('请先选择角色')
                            return
                          }

                          // 从assets数组读取最新的角色配置（确保数据一致性）
                          const character = assets.find(a => a.id === storyboard.characterId)
                          if (!character) return

                          // 设置生成中状态
                          setStoryboards(prev => 
                            prev.map(sb => 
                              sb.id === storyboard.id 
                                ? { ...sb, isGeneratingAudio: true }
                                : sb
                            )
                          )

                          // 模拟音频生成（3秒）
                          // 使用角色的TTS参数：voiceModel, speed, emotion
                          // 这里可以调用实际的TTS API，传入：
                          // - text: storyboard.dialogue
                          // - voiceModel: character.voiceModel
                          // - speed: character.speed
                          // - emotion: character.emotion
                          setTimeout(() => {
                            setStoryboards(prev => 
                              prev.map(sb => 
                                sb.id === storyboard.id 
                                  ? { 
                                      ...sb, 
                                      isGeneratingAudio: false,
                                      status: 'audio-synthesized' as StoryboardStatus
                                    }
                                  : sb
                              )
                            )
                          }, 3000)
                        }}
                        disabled={storyboard.isGeneratingAudio || !storyboard.characterId}
                        className="w-full flex flex-col items-center gap-2 px-4 py-2.5 bg-purple-500/80 hover:bg-purple-600/80 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {storyboard.isGeneratingAudio ? (
                          <>
                            {/* 音频波形生成中动画 */}
                            <div className="flex items-end gap-1 h-4">
                              <div className="w-1 bg-white rounded-full wave-bar" style={{ animationDelay: '0ms', height: '40%' }}></div>
                              <div className="w-1 bg-white rounded-full wave-bar" style={{ animationDelay: '100ms', height: '70%' }}></div>
                              <div className="w-1 bg-white rounded-full wave-bar" style={{ animationDelay: '200ms', height: '100%' }}></div>
                              <div className="w-1 bg-white rounded-full wave-bar" style={{ animationDelay: '300ms', height: '85%' }}></div>
                              <div className="w-1 bg-white rounded-full wave-bar" style={{ animationDelay: '400ms', height: '60%' }}></div>
                            </div>
                            <span className="text-xs text-center">
                              正在以 <span className="font-semibold">[{currentVoiceName || '未知'}]</span> 模式合成
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Volume2 size={16} />
                              <span>合成语音</span>
                            </div>
                            {currentVoiceName && (
                              <span className="text-xs opacity-75">
                                将使用: {currentVoiceName}
                              </span>
                            )}
                          </>
                        )}
                      </button>

                      {/* 生成状态显示 */}
                      <div className="flex items-center gap-2 text-xs">
                        {storyboard.status === 'image-generated' && (
                          <>
                            <CheckCircle size={14} className="text-green-400" />
                            <span className="text-green-400">图片已生成</span>
                          </>
                        )}
                        {storyboard.status === 'audio-synthesized' && (
                          <>
                            <CheckCircle size={14} className="text-blue-400" />
                            <span className="text-blue-400">音频已合成</span>
                          </>
                        )}
                        {storyboard.status === 'waiting-render' && (
                          <>
                            <Clock size={14} className="text-yellow-400" />
                            <span className="text-yellow-400">等待渲染</span>
                          </>
                        )}
                        {storyboard.status === 'pending' && (
                          <>
                            <Loader size={14} className="text-gray-400 animate-spin" />
                            <span className="text-gray-400">待处理</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 剧本管理界面 - Runway/Midjourney 风格 */}
        {currentStep === 'script' && (
          <div className="flex h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
            {/* 左侧剧本列表 */}
            <div className="w-80 border-r border-slate-700/50 bg-slate-900/50 backdrop-blur-xl flex flex-col">
              {/* 搜索和创建区域 */}
              <div className="p-4 border-b border-slate-700/50 space-y-3">
                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="搜索剧本..."
                    value={scriptSearchQuery}
                    onChange={(e) => setScriptSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm"
                  />
                </div>
                
                {/* 创建新剧本按钮 */}
                <button
                  onClick={() => {
                    setIsCreatingScript(true)
                    setNewScriptTitle('')
                    setNewScriptAuthor('')
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Plus size={18} />
                  创建新剧本
                </button>
              </div>

              {/* 剧本列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {scripts
                  .filter(script => 
                    script.title.toLowerCase().includes(scriptSearchQuery.toLowerCase()) ||
                    script.author.toLowerCase().includes(scriptSearchQuery.toLowerCase())
                  )
                  .map(script => (
                    <div
                      key={script.id}
                      data-script-id={script.id}
                      onClick={() => setSelectedScript(script)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedScript?.id === script.id
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600/50'
                      }`}
                    >
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">{script.title}</h3>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{script.author}</span>
                        <span>{script.scenes.length} 场景</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        {new Date(script.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  ))}
                
                {scripts.filter(script => 
                  script.title.toLowerCase().includes(scriptSearchQuery.toLowerCase()) ||
                  script.author.toLowerCase().includes(scriptSearchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    {scriptSearchQuery ? '未找到匹配的剧本' : '暂无剧本，点击上方按钮创建'}
                  </div>
                )}
              </div>
            </div>

            {/* 右侧编辑器 */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedScript ? (
                <>
                  {/* AI 扩写区域 */}
                  <div className="p-4 border-b border-slate-700/50 bg-slate-900/40 backdrop-blur-xl">
                    <div className="max-w-4xl mx-auto">
                      <div className="flex items-center gap-3 mb-3">
                        <SparklesIcon className="text-cyan-400" size={20} />
                        <h3 className="text-sm font-semibold text-slate-300">AI 智能扩写 (Google Gemini)</h3>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="输入故事梗概，例如：一个小男孩在森林里发现了一只发光的猫..."
                          className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                              e.preventDefault()
                              handleAIGenerate()
                            }
                          }}
                        />
                        <button
                          onClick={handleAIGenerate}
                          disabled={!aiPrompt.trim() || isGenerating}
                          className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <SparklesIcon size={16} />
                              AI 扩写
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 编辑器头部 */}
                  <div className="p-6 border-b border-slate-700/50 bg-slate-900/30 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{selectedScript.title}</h2>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span>作者: {selectedScript.author}</span>
                          <span>•</span>
                          <span>{selectedScript.scenes.length} 个场景</span>
                          <span>•</span>
                          <span>总时长: {selectedScript.scenes.reduce((sum, s) => sum + s.duration, 0).toFixed(1)} 秒</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleBatchGenerateStoryboards}
                          disabled={isBatchGenerating || !selectedScript || selectedScript.scenes.length === 0}
                          variant="primary"
                          size="md"
                          icon={isBatchGenerating ? Loader2 : Sparkles}
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                        >
                          {isBatchGenerating ? '批量生成中...' : '批量生成分镜'}
                        </Button>
                        <button
                          onClick={() => {
                            // 保存逻辑：将当前选中的剧本更新到 scripts 数组
                            setScripts(prev => prev.map(s => s.id === selectedScript.id ? selectedScript : s))
                            // 显示保存成功提示（可选）
                          }}
                          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium transition-all flex items-center gap-2"
                        >
                          <Save size={16} />
                          保存
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确定要删除这个剧本吗？')) {
                              setScripts(prev => prev.filter(s => s.id !== selectedScript.id))
                              setSelectedScript(null)
                            }
                          }}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-medium transition-all flex items-center gap-2"
                        >
                          <Trash2 size={16} />
                          删除
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 场景编辑器 */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                      {selectedScript.scenes.map((scene, index) => {
                        const isEditing = editingSceneIndex === index
                        const isRegenerating = regeneratingSceneIndex === index
                        
                        return (
                          <div
                            key={index}
                            className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl"
                          >
                            {/* 场景头部 */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center font-bold text-white">
                                  {scene.sceneNumber}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-white">场景 {scene.sceneNumber}</h3>
                                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                                    <span>时长: {scene.duration}秒</span>
                                    {scene.vfx_suggestion && (
                                      <>
                                        <span>•</span>
                                        <span className="text-cyan-400">{scene.vfx_suggestion}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* 手动编辑按钮 */}
                                <button
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingSceneIndex(null)
                                    } else {
                                      setEditingSceneIndex(index)
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                    isEditing
                                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
                                  }`}
                                >
                                  <Edit3 size={14} />
                                  {isEditing ? '完成编辑' : '手动编辑'}
                                </button>
                                
                                {/* 重新生成按钮 */}
                                <button
                                  onClick={() => handleRegenerateScene(index)}
                                  disabled={isRegenerating}
                                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isRegenerating ? (
                                    <>
                                      <Loader2 size={14} className="animate-spin" />
                                      生成中...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw size={14} />
                                      重新生成
                                    </>
                                  )}
                                </button>
                                
                                {/* 删除按钮 */}
                                <button
                                  onClick={() => {
                                    if (confirm('确定要删除这个场景吗？')) {
                                      const updatedScenes = selectedScript.scenes.filter((_, i) => i !== index)
                                      const updatedScript = {
                                        ...selectedScript,
                                        scenes: updatedScenes.map((s, i) => ({ ...s, sceneNumber: i + 1 }))
                                      }
                                      setSelectedScript(updatedScript)
                                      // 同步更新到 scripts 数组
                                      setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))
                                    }
                                  }}
                                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* 场景卡片内容 - 展示模式 */}
                            {!isEditing ? (
                              <>
                                {/* 生成进度条 */}
                                {isBatchGenerating && sceneGenerationProgress[scene.sceneNumber] !== undefined && (
                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-slate-300">生成进度</span>
                                      <span className="text-xs text-slate-400">
                                        {sceneGenerationProgress[scene.sceneNumber] === -1 
                                          ? '生成失败' 
                                          : sceneGenerationProgress[scene.sceneNumber] === 100
                                          ? '已完成'
                                          : `${Math.round(sceneGenerationProgress[scene.sceneNumber] || 0)}%`}
                                      </span>
                                    </div>
                                    <div className="w-full bg-[#F5F5F7] rounded-full h-2.5 overflow-hidden border border-[#E5E5E5]">
                                      <div
                                        className={`h-2.5 rounded-full transition-all duration-300 ease-out ${
                                          sceneGenerationProgress[scene.sceneNumber] === -1
                                            ? 'bg-red-500'
                                            : sceneGenerationProgress[scene.sceneNumber] === 100
                                            ? 'bg-green-500'
                                            : 'bg-[#000000]'
                                        }`}
                                        style={{ 
                                          width: sceneGenerationProgress[scene.sceneNumber] === -1 
                                            ? '100%' 
                                            : `${Math.max(0, Math.min(100, sceneGenerationProgress[scene.sceneNumber] || 0))}%` 
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* 生成的分镜图片 */}
                                {scene.imageUrl && (
                                  <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                      <Image size={16} />
                                      分镜图
                                    </label>
                                    <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/30">
                                      <img 
                                        src={scene.imageUrl} 
                                        alt={`场景 ${scene.sceneNumber} 分镜图`}
                                        className="w-full h-auto object-cover"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* 生成进度条 */}
                                {isBatchGenerating && sceneGenerationProgress[scene.sceneNumber] !== undefined && (
                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-slate-300">生成进度</span>
                                      <span className="text-xs text-slate-400">
                                        {sceneGenerationProgress[scene.sceneNumber] === -1 
                                          ? '生成失败' 
                                          : sceneGenerationProgress[scene.sceneNumber] === 100
                                          ? '已完成'
                                          : `${Math.round(sceneGenerationProgress[scene.sceneNumber] || 0)}%`}
                                      </span>
                                    </div>
                                    <div className="w-full bg-[#F5F5F7] rounded-full h-2.5 overflow-hidden border border-[#E5E5E5]">
                                      <div
                                        className={`h-2.5 rounded-full transition-all duration-300 ease-out ${
                                          sceneGenerationProgress[scene.sceneNumber] === -1
                                            ? 'bg-red-500'
                                            : sceneGenerationProgress[scene.sceneNumber] === 100
                                            ? 'bg-green-500'
                                            : 'bg-[#000000]'
                                        }`}
                                        style={{ 
                                          width: sceneGenerationProgress[scene.sceneNumber] === -1 
                                            ? '100%' 
                                            : `${Math.max(0, Math.min(100, sceneGenerationProgress[scene.sceneNumber] || 0))}%` 
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* 生成的分镜图片 */}
                                {scene.imageUrl && (
                                  <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                      <Image size={16} />
                                      分镜图
                                    </label>
                                    <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/30">
                                      <img 
                                        src={scene.imageUrl} 
                                        alt={`场景 ${scene.sceneNumber} 分镜图`}
                                        className="w-full h-auto object-cover"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* 画面描述 (Visual) */}
                                <div className="mb-4">
                                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <Image size={16} />
                                    画面描述 (Visual)
                                  </label>
                                  <div className="px-4 py-3 bg-slate-900/30 border border-slate-700/30 rounded-xl text-white text-sm min-h-[60px]">
                                    {scene.content || <span className="text-slate-500 italic">暂无描述</span>}
                                  </div>
                                </div>

                                {/* 对白 (Dialogue) */}
                                <div className="mb-4">
                                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <Volume2 size={16} />
                                    对白 (Dialogue)
                                  </label>
                                  <div className="px-4 py-3 bg-slate-900/30 border border-slate-700/30 rounded-xl text-white text-sm min-h-[50px]">
                                    {scene.dialogue || <span className="text-slate-500 italic">暂无对白</span>}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* 编辑模式 - 画面描述 */}
                                <div className="mb-4">
                                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <Image size={16} />
                                    画面描述 (Visual)
                                  </label>
                                  <textarea
                                    value={scene.content}
                                    onChange={(e) => {
                                      const updatedScenes = [...selectedScript.scenes]
                                      updatedScenes[index] = { ...updatedScenes[index], content: e.target.value }
                                      const updatedScript = { ...selectedScript, scenes: updatedScenes }
                                      setSelectedScript(updatedScript)
                                      // 同步更新到 scripts 数组
                                      setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))
                                    }}
                                    placeholder="描述这个场景的视觉画面..."
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none"
                                    rows={3}
                                    autoFocus
                                  />
                                </div>

                                {/* 编辑模式 - 对白 */}
                                <div className="mb-4">
                                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                    <Volume2 size={16} />
                                    对白 (Dialogue)
                                  </label>
                                  <textarea
                                    value={scene.dialogue}
                                    onChange={(e) => {
                                      const updatedScenes = [...selectedScript.scenes]
                                      updatedScenes[index] = { ...updatedScenes[index], dialogue: e.target.value }
                                      const updatedScript = { ...selectedScript, scenes: updatedScenes }
                                      setSelectedScript(updatedScript)
                                      // 同步更新到 scripts 数组
                                      setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))
                                    }}
                                    placeholder="输入旁白或对白内容..."
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none"
                                    rows={2}
                                  />
                                </div>
                              </>
                            )}

                          {/* 特效建议和时长 */}
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">特效/运镜建议</label>
                              <input
                                type="text"
                                value={scene.vfx_suggestion}
                                onChange={(e) => {
                                  const updatedScenes = [...selectedScript.scenes]
                                  updatedScenes[index] = { ...updatedScenes[index], vfx_suggestion: e.target.value }
                                  const updatedScript = { ...selectedScript, scenes: updatedScenes }
                                  setSelectedScript(updatedScript)
                                  // 同步更新到 scripts 数组
                                  setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))
                                }}
                                placeholder="如：推镜头、低头视角"
                                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">预计时长（秒）</label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={scene.duration}
                                onChange={(e) => {
                                  const updatedScenes = [...selectedScript.scenes]
                                  updatedScenes[index] = { ...updatedScenes[index], duration: parseFloat(e.target.value) || 0 }
                                  const updatedScript = { ...selectedScript, scenes: updatedScenes }
                                  setSelectedScript(updatedScript)
                                  // 同步更新到 scripts 数组
                                  setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))
                                }}
                                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )
                      })}

                      {/* 添加新场景按钮 */}
                      <button
                        onClick={() => {
                          const newSceneNumber = selectedScript.scenes.length + 1
                          const newScene: Scene = {
                            sceneNumber: newSceneNumber,
                            content: '',
                            dialogue: '',
                            vfx_suggestion: '',
                            duration: 5.0
                          }
                          const updatedScript = {
                            ...selectedScript,
                            scenes: [...selectedScript.scenes, newScene]
                          }
                          setSelectedScript(updatedScript)
                          // 同步更新到 scripts 数组
                          setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))
                        }}
                        className="w-full py-4 border-2 border-dashed border-slate-700/50 hover:border-cyan-500/50 rounded-2xl text-slate-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <Plus size={20} />
                        添加新场景
                      </button>

                      {/* 一键生成分镜图按钮 */}
                      {selectedScript.scenes.length > 0 && (
                        <button
                          onClick={() => {
                            // 提取当前剧本的所有 scenes 数组
                            const scenesData = selectedScript.scenes
                            
                            // 保存到 localStorage
                            try {
                              const dataToSave = {
                                scriptId: selectedScript.id,
                                scriptTitle: selectedScript.title,
                                scenes: scenesData,
                                timestamp: new Date().toISOString(),
                              }
                              localStorage.setItem('pending_storyboard_data', JSON.stringify(dataToSave))
                              
                              // 跳转到分镜图模块
                              setCurrentStep('storyboard')
                            } catch (error) {
                              alert('保存数据失败，请重试')
                            }
                          }}
                          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-3 mt-4"
                        >
                          <LayoutGrid size={24} />
                          一键生成分镜图
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <ScrollText size={64} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-lg">选择一个剧本开始编辑</p>
                    <p className="text-sm mt-2">或点击左侧按钮创建新剧本</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 创建新剧本 Modal */}
        {isCreatingScript && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/95 backdrop-blur-2xl border border-slate-700/50 w-full max-w-md rounded-2xl p-6 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-white">创建新剧本</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">剧本标题</label>
                  <input
                    type="text"
                    value={newScriptTitle}
                    onChange={(e) => setNewScriptTitle(e.target.value)}
                    placeholder="输入剧本标题..."
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">作者</label>
                  <input
                    type="text"
                    value={newScriptAuthor}
                    onChange={(e) => setNewScriptAuthor(e.target.value)}
                    placeholder="输入作者名称..."
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsCreatingScript(false)
                      setNewScriptTitle('')
                      setNewScriptAuthor('')
                    }}
                    className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-xl font-medium transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      if (newScriptTitle.trim() && newScriptAuthor.trim()) {
                        const newScript: Script = {
                          id: `script-${Date.now()}`,
                          title: newScriptTitle.trim(),
                          author: newScriptAuthor.trim(),
                          createdAt: new Date(),
                          scenes: []
                        }
                        setScripts(prev => [...prev, newScript])
                        setSelectedScript(newScript)
                        setIsCreatingScript(false)
                        setNewScriptTitle('')
                        setNewScriptAuthor('')
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all"
                  >
                    创建
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 视频生成界面 */}
        {currentStep === 'generate' && (
          <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white p-6 overflow-y-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">视频生成</h1>
              <p className="text-gray-600">基于分镜生成最终视频</p>
            </div>

            <div className="max-w-6xl mx-auto w-full space-y-6">
              {/* 生成配置卡片 */}
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-300/50 p-6 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">生成配置</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 动效模板选择 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      动效模板
                    </label>
                    <select className="w-full px-4 py-3 bg-white border border-gray-300/50 rounded-xl text-gray-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20">
                      <option value="High Action">High Action - 高动作强度</option>
                      <option value="Cinematic Slow">Cinematic Slow - 电影级慢动作</option>
                      <option value="Medium Motion">Medium Motion - 中等动作</option>
                      <option value="Subtle Movement">Subtle Movement - 轻微动作</option>
                      <option value="Dynamic Fast">Dynamic Fast - 快速动态</option>
                      <option value="Static">Static - 静态效果</option>
                    </select>
                  </div>

                  {/* 帧率设置 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      帧率 (FPS)
                    </label>
                    <input
                      type="number"
                      min="24"
                      max="60"
                      defaultValue="24"
                      className="w-full px-4 py-3 bg-white border border-gray-300/50 rounded-xl text-gray-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* 分镜列表预览 */}
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-300/50 p-6 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">分镜列表</h2>
                
                <div className="space-y-4">
                  {storyboards.map((storyboard, index) => {
                    const character = storyboard.characterId 
                      ? assets.find(a => a.id === storyboard.characterId)
                      : null
                    const scene = storyboard.sceneId
                      ? mockScenes.find(s => s.id === storyboard.sceneId)
                      : null

                    return (
                      <div
                        key={storyboard.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <div className="w-24 h-16 bg-gradient-to-br from-cyan-100 to-purple-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <span className="text-sm font-semibold text-gray-600">#{index + 1}</span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">
                              <span className="font-medium">角色:</span> {character?.name || '未选择'}
                            </span>
                            <span className="text-gray-600">
                              <span className="font-medium">场景:</span> {scene?.name || '未选择'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              storyboard.status !== 'pending'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {storyboard.status !== 'pending'
                                ? '就绪' 
                                : '待处理'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{storyboard.dialogue}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 生成按钮 */}
              <div className="text-center">
                <button className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-cyan-500/30 border border-gray-300/30">
                  <Video size={24} className="inline mr-2" />
                  开始生成视频
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 项目初始化 Modal - macOS 浅色风格 */}
        {isModalOpen && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-2xl border border-gray-300/50 w-full max-w-md rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">初始化项目</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">项目名称</label>
                  <input className="w-full bg-white backdrop-blur-sm border border-gray-300/50 rounded-xl px-4 py-3 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-gray-900 placeholder-gray-400" placeholder="我的 AI 电影..." />
                </div>
                <div className="flex gap-4">
                  <button className="flex-1 bg-cyan-50 backdrop-blur-sm border border-cyan-500/50 rounded-xl py-3 text-cyan-600 hover:bg-cyan-100 transition-all font-medium">16:9 横屏</button>
                  <button className="flex-1 bg-gray-50 backdrop-blur-sm border border-gray-300/50 rounded-xl py-3 text-gray-600 hover:bg-gray-100 transition-all font-medium">9:16 竖屏</button>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 backdrop-blur-sm text-white font-bold py-4 rounded-xl mt-4 border border-gray-300/30 shadow-lg transition-all"
                >
                  确认创建
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Toast 提示 - 资产同步成功（全局显示） */}
      {toastVisible && toastMessage && (
        <div 
          className={`fixed top-4 right-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-[9999] transition-all duration-300 ${
            toastVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
          }`}
          style={{
            animation: toastVisible ? 'slideInRight 0.3s ease-out' : 'slideOutRight 0.3s ease-in',
          }}
        >
          <div className="flex-shrink-0">
            <CheckCircle size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm leading-tight">{toastMessage}</p>
          </div>
          <button
            onClick={() => {
              setToastVisible(false)
              setTimeout(() => setToastMessage(null), 300)
            }}
            className="flex-shrink-0 ml-2 text-white/80 hover:text-white transition-colors"
            aria-label="关闭提示"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  )
}