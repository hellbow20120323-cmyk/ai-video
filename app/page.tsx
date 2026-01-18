'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Script, Scene } from '@/types/script'
import { useAssetStore } from '@/store/useAssetStore'
import { useProjectStore } from '@/store/useProjectStore'
import { Asset, AssetCategory } from '@/types/assets'
import { Card, Button, Input, Textarea, AssetCenter, ScriptManagement, StoryboardManagement } from '@/app/components'
import { motion, AnimatePresence } from 'framer-motion'
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
  Loader2,
  ChevronDown,
  Folder,
  Plus as PlusIcon,
  Settings
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

// OpenAI 标准音色选项（6 种）
const openAIVoiceOptions = [
  { id: 'alloy', name: 'Alloy（中性、清晰）', description: '中性音色，清晰自然' },
  { id: 'echo', name: 'Echo（回声）', description: '回声效果音色' },
  { id: 'fable', name: 'Fable（寓言）', description: '温暖叙事音色' },
  { id: 'onyx', name: 'Onyx（深沉男声）', description: '深沉磁性男声' },
  { id: 'nova', name: 'Nova（年轻女声）', description: '年轻活力女声' },
  { id: 'shimmer', name: 'Shimmer（温暖女声）', description: '温暖清晰女声' },
]

// 分镜类型
type StoryboardStatus = 'image-generated' | 'audio-synthesized' | 'waiting-render' | 'pending'

type StoryboardItem = {
  id: string
  imageUrl?: string
  characterIds: string[]  // 支持多个角色
  sceneId: string | null
  dialogue: string
  visualDescription?: string  // 视觉画面描述（来自场景的 content）
  status: StoryboardStatus
  isGeneratingAudio: boolean
  projectId: string | null  // 所属项目 ID
  scriptId?: string | null // 关联的剧本 ID，用于幂等性判断
}

// 模拟场景数据
const mockScenes = [
  { id: 'scene-1', name: '霓虹街头', prompt: 'A neon-lit cyberpunk street at night, rain-soaked, futuristic cityscape, vibrant neon signs, atmospheric lighting' },
  { id: 'scene-2', name: '地下实验室', prompt: 'A dim underground laboratory, multiple screens, high-tech equipment, mysterious atmosphere, sci-fi setting' },
  { id: 'scene-3', name: '虚拟空间', prompt: 'A virtual reality space, digital environment, holographic elements, abstract geometric shapes, cyber aesthetic' },
]

// 艺术风格类型
const artStyles = [
  { id: 'realistic-film', name: '写实电影', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'vintage-film', name: '复古胶片', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { id: '3d-clay', name: '3D 粘土', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'chinese-ink', name: '中式水墨', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { id: 'pixar-3d', name: '皮克斯 3D', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'ghibli-hand', name: '吉卜力手绘', color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'pixel-art', name: '像素艺术', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { id: 'cyberpunk', name: '赛博朋克', color: 'bg-purple-100 text-purple-700 border-purple-300' },
]

// 文化背景类型
const culturalBackgrounds = [
  { id: 'steampunk', name: '蒸汽朋克', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { id: 'modern-city', name: '现代都市', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'western-frontier', name: '西域边塞', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'future-world', name: '未来世界', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'virtual-space', name: '虚拟空间', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { id: 'chinese-ancient', name: '中式古装', color: 'bg-red-100 text-red-700 border-red-300' },
  { id: 'chinese-modern', name: '中式现代', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  { id: 'japanese', name: '日本文化', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { id: 'nordic', name: '极简北欧', color: 'bg-teal-100 text-teal-700 border-teal-300' },
]

export default function App() {
  // 定义挂载状态：水合保护
  const [mounted, setMounted] = useState(false)

  // 副作用追踪：组件挂载后设置为 true
  useEffect(() => {
    setMounted(true)
  }, [])

  // 从 Zustand Store 获取资产数据 - 必须在所有 useEffect 之前定义
  const allCharacters = useAssetStore((state) => state.characters)
  const allProps = useAssetStore((state) => state.props)
  const allScenes = useAssetStore((state) => state.scenes)
  const storeTheme = useAssetStore((state) => state.theme)
  
  // 从项目 Store 获取数据
  // 注意：projects 是原始数组，未经过过滤，用于下拉菜单显示所有项目
  // 直接从 useProjectStore 获取，确保是全量数据
  const projects = useProjectStore((state) => state.projects)
  const currentProjectId = useProjectStore((state) => state.currentProjectId)
  
  // 跟踪 store 是否已完成 hydration（从 localStorage 加载数据）
  const [storeHydrated, setStoreHydrated] = useState(false)
  
  // 检查 store 是否已完成 hydration（从 localStorage 加载数据）
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return
    
    // 检查 store 是否已完成 hydration
    const checkStoreHydration = () => {
      try {
        // 直接从 store 获取数据
        const storeProjects = useProjectStore.getState().projects
        
        // 检查 localStorage 中是否有项目数据
        const stored = localStorage.getItem('ai-video-platform-projects')
        
        console.log('🔍 [Store Hydration] 检查中...')
        console.log('  - Store 项目数量:', storeProjects.length)
        console.log('  - localStorage 存在:', !!stored)
        
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            const storedProjects = parsed?.state?.projects || []
            
            console.log('  - localStorage 项目数量:', storedProjects.length)
            
            // 如果 store 中有数据或 localStorage 中有数据，认为已 hydration
            if (storeProjects.length > 0 || storedProjects.length > 0) {
              setStoreHydrated(true)
              console.log('✅ [Store Hydration] 完成 - 有项目数据')
              console.log('  - Store 项目列表:', storeProjects.map(p => p.name))
            } else {
              // 即使都是空数组，也认为已 hydration（空数组也是有效状态）
              setStoreHydrated(true)
              console.log('✅ [Store Hydration] 完成 - 无项目数据（空数组）')
            }
          } catch (parseError) {
            console.error('❌ [Store Hydration] 解析 localStorage 数据失败:', parseError)
            // 即使解析失败，如果 store 中有数据，也认为已 hydration
            if (storeProjects.length > 0) {
              setStoreHydrated(true)
              console.log('✅ [Store Hydration] 完成 - 使用 Store 数据')
            } else {
              // 如果 store 也没有数据，延迟设置 hydration
              setTimeout(() => setStoreHydrated(true), 100)
            }
          }
        } else {
          // 即使没有存储数据，也认为已 hydration（空数组也是有效状态）
          setStoreHydrated(true)
          console.log('✅ [Store Hydration] 完成 - 无 localStorage 数据')
        }
      } catch (error) {
        console.error('❌ [Store Hydration] 检查失败:', error)
        // 出错时也尝试设置已 hydration，避免阻塞
        setStoreHydrated(true)
      }
    }
    
    // 立即检查一次
    checkStoreHydration()
    
    // 延迟再检查一次，确保 Zustand persist 有时间完成 hydration
    const timer1 = setTimeout(checkStoreHydration, 100)
    const timer2 = setTimeout(checkStoreHydration, 300)
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [mounted])
  
  // 调试：监听 projects 变化，确保数据正确加载
  useEffect(() => {
    if (mounted && storeHydrated) {
      const storeProjects = useProjectStore.getState().projects
      console.log('🔍 [项目下拉菜单] 当前所有项目 (从 store 直接获取):', storeProjects)
      console.log('🔍 [项目下拉菜单] 项目数量:', storeProjects.length)
      console.log('🔍 [项目下拉菜单] 当前项目 ID:', currentProjectId)
      console.log('🔍 [项目下拉菜单] 项目列表详情:', storeProjects.map(p => ({ id: p.id, name: p.name })))
      console.log('🔍 [项目下拉菜单] projects 变量长度:', projects.length)
      console.log('🔍 [项目下拉菜单] 数据一致性:', projects.length === storeProjects.length ? '✓ 一致' : '⚠️ 不一致')
    }
  }, [projects, currentProjectId, mounted, storeHydrated])
  
  // 过滤当前项目的资产数据 - 使用 useMemo 稳定资产引用，避免无限更新
  const storeCharacters = React.useMemo(() => 
    allCharacters.filter(char => char.projectId === currentProjectId), 
    [allCharacters, currentProjectId]
  )

  const storeProps = React.useMemo(() => 
    allProps.filter(prop => prop.projectId === currentProjectId), 
    [allProps, currentProjectId]
  )

  const storeScenes = React.useMemo(() => 
    allScenes.filter(scene => scene.projectId === currentProjectId), 
    [allScenes, currentProjectId]
  )
  const updateCharacter = useAssetStore((state) => state.updateCharacter)
  const updateProp = useAssetStore((state) => state.updateProp)
  const updateScene = useAssetStore((state) => state.updateScene)
  const setTheme = useAssetStore((state) => state.setTheme)
  const removeCharacter = useAssetStore((state) => state.removeCharacter)
  const removeProp = useAssetStore((state) => state.removeProp)
  const removeScene = useAssetStore((state) => state.removeScene)
  
  const addProject = useProjectStore((state) => state.addProject)
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const removeProject = useProjectStore((state) => state.removeProject)
  const getCurrentProject = useProjectStore((state) => state.getCurrentProject)
  
  const [currentStep, setCurrentStep] = useState('overview')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // 项目选择器状态
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectArtStyle, setNewProjectArtStyle] = useState('')
  const [newProjectCulturalBg, setNewProjectCulturalBg] = useState('')
  
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
              projectId: currentProjectId,
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
              projectId: currentProjectId,
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
              projectId: currentProjectId,
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
              projectId: currentProjectId,
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
  /**
   * 同步提取的资产到资产中心
   * @param extractedAssets - 从 API 返回的 extracted_assets 对象
   */
  const syncExtractedAssets = (extractedAssets: any) => {
    if (!extractedAssets) return
    
    const store = useAssetStore.getState()
    const assetsToSync: Asset[] = []
    const newAssetIds: string[] = [] // 记录新生成的资产 ID
    
    // 转换角色 - 增量更新：只追加新角色，不覆盖现有角色
    if (extractedAssets.characters && Array.isArray(extractedAssets.characters)) {
      extractedAssets.characters.forEach((char: any) => {
        if (char.name && char.description) {
          // 检查是否已存在同名角色
          const existingChar = storeCharacters.find(c => c.name.toLowerCase().trim() === char.name.toLowerCase().trim())
          
          if (!existingChar) {
            // 如果不存在，生成唯一 ID 并添加新角色（增量追加，不覆盖现有角色）
            // 确保 ID 格式统一：char_ + 时间戳 + 随机字符串
            const characterId = char.id || (typeof crypto !== 'undefined' && crypto.randomUUID 
              ? `char_${crypto.randomUUID().replace(/-/g, '')}` 
              : `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
            
            // 添加到统一的 assets 数组
            assetsToSync.push({
              id: characterId,
              category: AssetCategory.CHARACTER,
              name: char.name,
              visualDescription: char.description,
              createdAt: new Date(),
              projectId: currentProjectId,
            })
            
            // 添加到独立的 characters 数组（增量追加）
            // 使用 addCharacter 方法添加角色（它会自动生成 ID）
            store.addCharacter({
              name: char.name,
              description: char.description
            })
            
            // 获取刚添加的角色，使用它的实际 ID（Store 生成的）
            // 注意：虽然我们生成了 characterId，但 Store 的 addCharacter 会生成自己的 ID
            // 为了保持一致性，我们使用 Store 生成的 ID 并更新 assetsToSync
            const updatedCharacters = store.characters
            const addedChar = updatedCharacters.filter(c => c.name === char.name).pop()
            if (addedChar) {
              // 使用 Store 实际生成的 ID
              newAssetIds.push(addedChar.id)
              // 更新 assetsToSync 中的 ID 以保持一致
              const assetIndex = assetsToSync.findIndex(a => a.name === char.name && a.category === AssetCategory.CHARACTER)
              if (assetIndex !== -1) {
                assetsToSync[assetIndex].id = addedChar.id
              }
            } else {
              newAssetIds.push(characterId)
            }
          }
          // 如果已存在同名角色，跳过（不覆盖用户手动创建的角色）
        }
      })
    }
    
    // 转换场景 - 增量更新
    if (extractedAssets.scenes && Array.isArray(extractedAssets.scenes)) {
      extractedAssets.scenes.forEach((scene: any) => {
        if (scene.name && scene.description) {
          const existingScene = storeScenes.find(s => s.name.toLowerCase().trim() === scene.name.toLowerCase().trim())
          
          if (!existingScene) {
            const sceneId = scene.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
            
            assetsToSync.push({
              id: sceneId,
              category: AssetCategory.SCENE,
              name: scene.name,
              visualDescription: scene.description,
              createdAt: new Date(),
              projectId: currentProjectId,
            })
            
            store.addScene({
              name: scene.name,
              description: scene.description
            })
            
            // 获取刚添加的场景，使用它的实际 ID
            const updatedScenes = store.scenes
            const addedScene = updatedScenes.filter(s => s.name === scene.name).pop()
            if (addedScene) {
              newAssetIds.push(addedScene.id)
              const assetIndex = assetsToSync.findIndex(a => a.name === scene.name && a.category === AssetCategory.SCENE)
              if (assetIndex !== -1) {
                assetsToSync[assetIndex].id = addedScene.id
              }
            } else {
              newAssetIds.push(sceneId)
            }
          }
        }
      })
    }
    
    // 转换道具 - 增量更新
    if (extractedAssets.props && Array.isArray(extractedAssets.props)) {
      extractedAssets.props.forEach((prop: any) => {
        if (prop.name && prop.description) {
          const existingProp = storeProps.find(p => p.name.toLowerCase().trim() === prop.name.toLowerCase().trim())
          
          if (!existingProp) {
            const propId = prop.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
            
            assetsToSync.push({
              id: propId,
              category: AssetCategory.PROP,
              name: prop.name,
              visualDescription: prop.description,
              createdAt: new Date(),
              projectId: currentProjectId,
            })
            
            store.addProp({
              name: prop.name,
              visualDetails: prop.description
            })
            
            // 获取刚添加的道具，使用它的实际 ID
            const updatedProps = store.props
            const addedProp = updatedProps.filter(p => p.name === prop.name).pop()
            if (addedProp) {
              newAssetIds.push(addedProp.id)
              const assetIndex = assetsToSync.findIndex(a => a.name === prop.name && a.category === AssetCategory.PROP)
              if (assetIndex !== -1) {
                assetsToSync[assetIndex].id = addedProp.id
              }
            } else {
              newAssetIds.push(propId)
            }
          }
        }
      })
    }
    
    // 同步资产到统一的 assets 数组
    if (assetsToSync.length > 0) {
      store.syncAssets(assetsToSync)
      
      // 更新新生成资产的 ID 集合（用于在下拉列表中显示标记）
      setAutoGeneratedAssetIds(prev => {
        const newSet = new Set(prev)
        newAssetIds.forEach(id => newSet.add(id))
        return newSet
      })
      
      const characterCount = assetsToSync.filter(a => a.category === AssetCategory.CHARACTER).length
      const sceneCount = assetsToSync.filter(a => a.category === AssetCategory.SCENE).length
      const propCount = assetsToSync.filter(a => a.category === AssetCategory.PROP).length
      
      // 显示 Apple 风格通知
      const parts: string[] = []
      if (characterCount > 0) parts.push(`${characterCount} 个角色`)
      if (sceneCount > 0) parts.push(`${sceneCount} 个场景`)
      if (propCount > 0) parts.push(`${propCount} 个道具`)
      
      if (parts.length > 0) {
        setToastMessage(`已自动识别并更新资产中心：${parts.join('，')}`)
        setToastVisible(true)
        setTimeout(() => {
          setToastVisible(false)
          setTimeout(() => setToastMessage(null), 300)
        }, 3000)
      }
    }
  }

  /**
   * 剧本与分镜的深度自动化同步
   * 将剧本中的所有场景自动转换为分镜卡片，并智能绑定角色
   * @param script - 要同步的剧本对象
   */
  const syncToStoryboard = (script: Script) => {
    if (!script || !script.scenes || script.scenes.length === 0) {
      console.warn('[syncToStoryboard] 剧本为空或没有场景，跳过同步')
      return
    }

    if (!currentProjectId) {
      console.warn('[syncToStoryboard] 当前项目 ID 为空，跳过同步')
      return
    }

    try {
      // 1. 从 store 获取最新的角色列表（确保使用同步资产后的最新数据）
      const store = useAssetStore.getState()
      const latestCharacters = store.characters.filter(char => char.projectId === currentProjectId)
      
      console.log(`[syncToStoryboard] 开始同步剧本 "${script.title}"，共 ${script.scenes.length} 个场景`)
      console.log(`[syncToStoryboard] 当前项目角色数量: ${latestCharacters.length}`)

      // 2. 根据角色名称匹配角色 ID 的辅助函数（三级匹配策略）
      const matchCharacterIdsByName = (characterNames: string[]): string[] => {
        if (!characterNames || characterNames.length === 0) return []
        
        const matchedIds: string[] = []
        characterNames.forEach(name => {
          // 第一级：精确匹配
          const exactMatch = latestCharacters.find(char => char.name === name)
          if (exactMatch) {
            matchedIds.push(exactMatch.id)
            return
          }
          
          // 第二级：模糊匹配（忽略大小写和空格）
          const fuzzyMatch = latestCharacters.find(char => 
            char.name.toLowerCase().trim() === name.toLowerCase().trim()
          )
          if (fuzzyMatch) {
            matchedIds.push(fuzzyMatch.id)
            return
          }
          
          // 第三级：宽松匹配（包含关系）
          const looseMatch = latestCharacters.find(char => 
            char.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(char.name.toLowerCase())
          )
          if (looseMatch) {
            matchedIds.push(looseMatch.id)
          }
        })
        
        // 去重
        return Array.from(new Set(matchedIds))
      }

      // 3. 数据映射：遍历剧本中的所有 scenes，转换为 StoryboardItem
      const newStoryboards: StoryboardItem[] = script.scenes.map((scene, index) => {
        // 3.1 智能绑定：遍历每个场景中出现的角色名称，自动查找匹配的 ID
        const characterIds = scene.characters && Array.isArray(scene.characters) && scene.characters.length > 0
          ? matchCharacterIdsByName(scene.characters)
          : []
        
        if (characterIds.length > 0) {
          console.log(`[syncToStoryboard] 场景 ${index + 1} 匹配到 ${characterIds.length} 个角色:`, characterIds)
        }

        // 3.2 字段对齐：将 scene.content 映射为 visualDescription，将 scene.dialogue 映射为分镜的对白
        // 强化数据写入：确保每个分镜对象都必须包含 projectId 和 scriptId
        return {
          id: `sb-${Date.now()}-${script.id}-${index}`,
          characterIds: characterIds, // 自动匹配并填充角色 ID
          sceneId: null,
          dialogue: scene.dialogue || '', // 映射 scene.dialogue
          visualDescription: scene.content || '', // 映射 scene.content 为 visualDescription
          status: 'pending' as StoryboardStatus,
          isGeneratingAudio: false,
          projectId: currentProjectId, // 强化：必须包含 projectId
          scriptId: script.id, // 强化：必须包含 scriptId，用于幂等性判断和数据关联
        }
      })

      // 4. 状态清理：增量追加，不覆盖已有分镜
      // 读取现有的分镜数据
      const existingStoryboardsStr = localStorage.getItem('ai-video-platform-storyboards')
      let existingStoryboards: StoryboardItem[] = []
      
      if (existingStoryboardsStr) {
        try {
          existingStoryboards = JSON.parse(existingStoryboardsStr)
        } catch (parseError) {
          console.error('[syncToStoryboard] 解析现有分镜数据失败:', parseError)
          existingStoryboards = []
        }
      }

      // 4.1 幂等性检查：如果该剧本的分镜已存在，跳过追加
      const existingStoryboardsForScript = existingStoryboards.filter(
        sb => sb.scriptId === script.id && sb.projectId === currentProjectId
      )
      
      if (existingStoryboardsForScript.length > 0) {
        console.log(`[syncToStoryboard] 剧本 "${script.title}" 的分镜已存在（${existingStoryboardsForScript.length} 个），跳过同步`)
        return
      }

      // 4.2 增量追加：将新剧本的分镜追加到列表末尾
      const updatedStoryboards = [...existingStoryboards, ...newStoryboards]
      
      // 保存到 localStorage
      localStorage.setItem('ai-video-platform-storyboards', JSON.stringify(updatedStoryboards))
      
      console.log(`✅ [syncToStoryboard] 成功同步 ${newStoryboards.length} 个分镜项到项目 "${currentProjectId}"`)
    } catch (error) {
      console.error('[syncToStoryboard] 同步分镜失败:', error)
      // 不阻止主流程，静默处理错误
    }
  }

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
      // 获取当前项目的艺术风格和文化背景
      const currentProject = getCurrentProject()
      const artStyle = currentProject?.artStyle || ''
      const culturalBackground = currentProject?.culturalBackground || ''
      
      // 直接调用 API 生成剧本
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyOutline: storyAdaptation,
          artStyle,
          culturalBackground,
        }),
      })

      clearInterval(progressInterval)
      setScriptGenerationProgress(100)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '生成剧本失败，请稍后重试')
      }

      const data = await response.json()
      console.log('API 返回的原始资产数据:', data.extracted_assets)
      const generatedScenes: Scene[] = data.scenes || []

      if (generatedScenes.length === 0) {
        throw new Error('未生成任何场景，请重试')
      }

      // 同步提取的资产到资产中心
      syncExtractedAssets(data.extracted_assets)

      // 创建新剧本并添加到列表
      const newScript: Script = {
        id: `script-${Date.now()}`,
        title: typeof storyAdaptation.assets.theme === 'object' 
          ? storyAdaptation.assets.theme.visual_style 
          : storyAdaptation.assets.theme || '新剧本',
        author: 'AI 生成',
        createdAt: new Date(),
        scenes: generatedScenes,
        projectId: currentProjectId,
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

      // 增强 handleConfirmAdaptationAndGenerate：在剧本生成并成功调用 setScripts 之后，立即调用 syncToStoryboard
      syncToStoryboard(newScript)

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
  
  // 侧边栏资产编辑面板状态
  const [isAssetSidebarOpen, setIsAssetSidebarOpen] = useState(false)
  const [sidebarAssetId, setSidebarAssetId] = useState<string | null>(null)
  const [sidebarAssetType, setSidebarAssetType] = useState<'character' | 'prop' | 'scene' | null>(null)
  
  // 角色编辑状态（包括音色）
  const [editingCharacterVoiceId, setEditingCharacterVoiceId] = useState<string>('gentle-female')
  const [isPlayingCharacterVoice, setIsPlayingCharacterVoice] = useState(false)
  
  // 跟踪新生成的资产 ID（用于在下拉列表中显示标记）
  const [autoGeneratedAssetIds, setAutoGeneratedAssetIds] = useState<Set<string>>(new Set())
  
  // 当侧边栏打开时，初始化编辑状态 - 优化版本，防止频繁触发 setState
  useEffect(() => {
    // 增加判断：只有在侧边栏打开且有明确 ID 时才执行初始化
    if (isAssetSidebarOpen && sidebarAssetId && sidebarAssetType) {
      let targetAsset = null
      
      if (sidebarAssetType === 'character') {
        targetAsset = storeCharacters.find(c => c.id === sidebarAssetId)
      } else if (sidebarAssetType === 'prop') {
        targetAsset = storeProps.find(p => p.id === sidebarAssetId)
      } else if (sidebarAssetType === 'scene') {
        targetAsset = storeScenes.find(s => s.id === sidebarAssetId)
      }

      if (targetAsset) {
        // 关键：只有当内容真正不同时才更新状态
        setEditingName(prev => prev !== targetAsset.name ? targetAsset.name : prev)
        const desc = sidebarAssetType === 'prop' 
          ? (targetAsset as any).visualDetails 
          : (targetAsset as any).description
        setEditingDescription(prev => prev !== desc ? desc : prev)
        
        // 如果是角色，初始化音色选择（资产隔离：从角色的 voiceId 属性读取）
        if (sidebarAssetType === 'character') {
          const voiceId = (targetAsset as any).voiceId || 'shimmer' // 默认使用 shimmer
          setEditingCharacterVoiceId(voiceId)
        }
      }
    }
  }, [isAssetSidebarOpen, sidebarAssetId, sidebarAssetType, storeCharacters, storeProps, storeScenes])
  
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
   * 计算资产在当前选中剧本中的引用次数
   * @param assetName - 资产名称
   * @param category - 资产类别
   * @returns 引用次数
   */
  const getAssetReferenceCount = (assetName: string, category: AssetCategory): number => {
    if (!selectedScript) return 0
    
    let count = 0
    selectedScript.scenes.forEach(scene => {
      const sceneText = `${scene.content} ${scene.dialogue}`.toLowerCase()
      const assetNameLower = assetName.toLowerCase()
      
      // 计算资产名称在场景文本中出现的次数
      const matches = sceneText.match(new RegExp(assetNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
      if (matches) {
        count += matches.length
      }
    })
    
    return count
  }

  /**
   * 获取资产的静态图 URL
   * 如果没有 referenceImageUrl，则根据类别返回对应的占位图
   * @param asset - 资产对象
   * @returns 图片 URL
   */
  const getAssetImageUrl = (asset: { referenceImageUrl?: string | null; category: AssetCategory }): string | null => {
    // 如果有参考图，优先使用
    if (asset.referenceImageUrl) {
      return asset.referenceImageUrl
    }
    
    // 根据类别返回对应的静态占位图
    switch (asset.category) {
      case AssetCategory.CHARACTER:
        return 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000'
      case AssetCategory.SCENE:
        return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000'
      case AssetCategory.PROP:
        return 'https://images.unsplash.com/photo-1526170315870-35874f48d622?q=80&w=1000'
      default:
        return null
    }
  }

  // 项目选择器点击外部关闭逻辑
  const projectSelectorRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectSelectorRef.current && !projectSelectorRef.current.contains(event.target as Node)) {
        setIsProjectSelectorOpen(false)
      }
    }
    
    if (isProjectSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProjectSelectorOpen])

  // 项目切换动画状态
  const [isProjectTransitioning, setIsProjectTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right')
  const prevProjectIdRef = useRef<string | null>(currentProjectId)

  // 监听项目切换，重置状态并触发过渡动画（仅在 mounted 后执行，防止首屏闪烁）
  useEffect(() => {
    // 防止首屏闪烁：仅在 mounted 为 true 后执行
    if (!mounted) return

    // 如果是首次加载，不执行切换逻辑
    if (prevProjectIdRef.current === null && currentProjectId === null) {
      return
    }

    // 如果项目 ID 没有变化，不执行切换逻辑
    if (prevProjectIdRef.current === currentProjectId) {
      return
    }

    // 确定切换方向（用于动画）
    const prevIndex = projects.findIndex(p => p.id === prevProjectIdRef.current)
    const currentIndex = projects.findIndex(p => p.id === currentProjectId)
    if (prevIndex !== -1 && currentIndex !== -1) {
      setTransitionDirection(currentIndex > prevIndex ? 'right' : 'left')
    }

    // 过渡动画：触发切换动画
    setIsProjectTransitioning(true)

    // ========== 彻底清理工作区：实现"项目制"管理 ==========
    
    // 1. 故事改编相关状态
    setStoryText('')
    setIsAnalyzing(false)
    setProgress(0)
    setAnalysisResult(null)
    setStoryAdaptation(null)

    // 2. 剧本管理相关状态
    setSelectedScript(null)
    setScriptSearchQuery('')
    setIsCreatingScript(false)
    setNewScriptTitle('')
    setNewScriptAuthor('')
    setIsGeneratingScript(false)
    setScriptGenerationError(null)
    setScriptGenerationProgress(0)

    // 3. AI 生成相关状态
    setAiPrompt('')
    setIsGenerating(false)
    setRegeneratingSceneIndex(null)
    setEditingSceneIndex(null)
    setIsBatchGenerating(false)
    setSceneGenerationProgress({})

    // 4. 资产中心相关状态
    setIsAssetSidebarOpen(false)
    setSidebarAssetId(null)
    setSidebarAssetType(null)
    setEditingAssetId(null)
    setEditingAssetType(null)
    setEditingName('')
    setEditingDescription('')
    setGeneratingImageId(null)
    setGeneratingImageProgress(0)
    setAutoGeneratedAssetIds(new Set()) // 清空自动生成的资产 ID 集合

    // 5. 背景设置状态
    setSelectedArtStyle(null)
    setSelectedCulturalBg(null)

    // 6. UI 状态重置
    setCurrentStep('overview') // 重置到项目概览页面
    setIsProjectSelectorOpen(false) // 关闭项目选择器
    setIsCreatingProject(false) // 关闭创建项目弹窗
    setIsModalOpen(false) // 关闭所有模态框
    setToastMessage(null) // 清空提示消息
    setToastVisible(false) // 隐藏提示
    setAssetTab('character') // 重置资产中心标签页到默认值

    // 7. 创建项目表单状态（防止表单数据残留）
    setNewProjectName('')
    setNewProjectArtStyle('')
    setNewProjectCulturalBg('')

    // ========== 清理完成：工作区已彻底重置，新项目将从干净状态开始 ==========

    // 延迟结束动画，让用户看到切换效果（300ms 后关闭过渡动画）
    const timer = setTimeout(() => {
      setIsProjectTransitioning(false)
      prevProjectIdRef.current = currentProjectId
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [currentProjectId, projects, mounted])

  /**
   * 角色多选组件
   * 支持多选、标签化展示、头像预览和平滑动画
   */
  const CharacterMultiSelect = ({ 
    storyboardId, 
    selectedIds, 
    onSelectionChange 
  }: { 
    storyboardId: string
    selectedIds: string[]
    onSelectionChange: (ids: string[]) => void 
  }) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    
    // 点击外部关闭下拉框
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }
      
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])
    
    // 获取角色的头像 URL
    const getCharacterAvatar = (characterId: string): string | null => {
      const store = useAssetStore.getState()
      const assets = store.getAssetsByCategory(AssetCategory.CHARACTER)
      const asset = assets.find(a => a.id === characterId)
      return asset ? getAssetImageUrl(asset) : null
    }
    
    const toggleCharacter = (characterId: string) => {
      if (selectedIds.includes(characterId)) {
        onSelectionChange(selectedIds.filter(id => id !== characterId))
      } else {
        onSelectionChange([...selectedIds, characterId])
      }
    }
    
    const removeCharacter = (characterId: string) => {
      onSelectionChange(selectedIds.filter(id => id !== characterId))
    }
    
    return (
      <div className="relative" ref={dropdownRef}>
        {/* 下拉框触发器 */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
        >
          <span className="text-gray-400">选择角色...</span>
          <ChevronDown 
            size={16} 
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        
        {/* 下拉菜单 */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto"
            >
              {storeCharacters.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400 text-center">暂无角色</div>
              ) : (
                storeCharacters.map(character => {
                  const isSelected = selectedIds.includes(character.id)
                  const isAutoGenerated = autoGeneratedAssetIds.has(character.id)
                  const avatarUrl = getCharacterAvatar(character.id)
                  
                  return (
                    <motion.button
                      key={character.id}
                      type="button"
                      onClick={() => toggleCharacter(character.id)}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-700/50 transition-colors ${
                        isSelected ? 'bg-cyan-500/20' : ''
                      }`}
                      whileHover={{ backgroundColor: 'rgba(51, 65, 85, 0.5)' }}
                    >
                      {/* 头像预览 */}
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
                        {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt={character.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={14} className="w-full h-full text-gray-400 p-1" />
                        )}
                      </div>
                      
                      {/* 角色名称 */}
                      <span className="flex-1 text-white">{character.name}</span>
                      
                      {/* 选中标记 */}
                      {isSelected && (
                        <CheckCircle size={14} className="text-cyan-400 flex-shrink-0" />
                      )}
                      
                      {/* 自动生成标记 */}
                      {isAutoGenerated && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"></span>
                      )}
                    </motion.button>
                  )
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 已选中的角色标签 */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <AnimatePresence mode="popLayout">
              {selectedIds.map(charId => {
                const char = storeCharacters.find(c => c.id === charId)
                if (!char) return null
                const avatarUrl = getCharacterAvatar(charId)
                
                return (
                  <motion.span
                    key={charId}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 text-gray-200 rounded-full text-xs border border-slate-600 shadow-sm"
                  >
                    {/* 微型圆形头像 */}
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-600 flex-shrink-0">
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={char.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={10} className="w-full h-full text-gray-400 p-0.5" />
                      )}
                    </div>
                    
                    {/* 角色名称 */}
                    <span className="font-medium">{char.name}</span>
                    
                    {/* 删除按钮 */}
                    <button
                      onClick={() => removeCharacter(charId)}
                      className="ml-0.5 hover:bg-slate-600 rounded-full p-0.5 transition-colors flex-shrink-0"
                      aria-label="移除角色"
                    >
                      <X size={10} className="text-gray-300 hover:text-red-400" />
                    </button>
                  </motion.span>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    )
  }

  /**
   * 渲染带资产标签的文本
   * 识别文本中的资产名称，并将其渲染为可点击的标签
   * @param text - 原始文本
   * @returns React 元素数组
   */
  const renderTextWithAssetTags = (text: string): React.ReactNode[] => {
    if (!text) return [<span key="empty" className="text-slate-500 italic">暂无描述</span>]
    
    const store = useAssetStore.getState()
    const allAssets = [
      ...store.getAssetsByCategory(AssetCategory.CHARACTER),
      ...store.getAssetsByCategory(AssetCategory.PROP),
      ...store.getAssetsByCategory(AssetCategory.SCENE),
    ]
    
    // 按名称长度降序排序，优先匹配长名称
    const sortedAssets = allAssets.sort((a, b) => b.name.length - a.name.length)
    
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let keyCounter = 0
    
    // 查找所有资产名称在文本中的位置
    const matches: Array<{ asset: Asset; start: number; end: number }> = []
    
    sortedAssets.forEach(asset => {
      const regex = new RegExp(asset.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      let match: RegExpExecArray | null
      while ((match = regex.exec(text)) !== null) {
        // 检查是否与已有匹配重叠
        const overlaps = matches.some(m => 
          (match!.index! >= m.start && match!.index! < m.end) ||
          (match!.index! + match![0].length > m.start && match!.index! + match![0].length <= m.end) ||
          (match!.index! <= m.start && match!.index! + match![0].length >= m.end)
        )
        
        if (!overlaps) {
          matches.push({
            asset,
            start: match.index!,
            end: match.index! + match[0].length
          })
        }
      }
    })
    
    // 按位置排序
    matches.sort((a, b) => a.start - b.start)
    
    // 构建渲染结果
    matches.forEach(match => {
      // 添加匹配前的文本
      if (match.start > lastIndex) {
        parts.push(
          <span key={`text-${keyCounter++}`}>
            {text.substring(lastIndex, match.start)}
          </span>
        )
      }
      
      // 添加资产标签
      const assetCategory = match.asset.category
      const tagColor = assetCategory === AssetCategory.CHARACTER 
        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
        : assetCategory === AssetCategory.SCENE
        ? 'bg-green-500/20 text-green-300 border-green-500/50'
        : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      
      parts.push(
        <span
          key={`tag-${keyCounter++}`}
          onClick={(e) => {
            e.stopPropagation()
            // 根据资产类型找到对应的 ID
            let assetId: string | null = null
            if (assetCategory === AssetCategory.CHARACTER) {
              const char = storeCharacters.find(c => c.name === match.asset.name)
              assetId = char?.id || null
            } else if (assetCategory === AssetCategory.PROP) {
              const prop = storeProps.find(p => p.name === match.asset.name)
              assetId = prop?.id || null
            } else if (assetCategory === AssetCategory.SCENE) {
              const scene = storeScenes.find(s => s.name === match.asset.name)
              assetId = scene?.id || null
            }
            
            if (assetId) {
              // 初始化编辑状态
              if (assetCategory === AssetCategory.CHARACTER) {
                const char = storeCharacters.find(c => c.id === assetId)
                if (char) {
                  setEditingName(char.name)
                  setEditingDescription(char.description)
                }
              } else if (assetCategory === AssetCategory.PROP) {
                const prop = storeProps.find(p => p.id === assetId)
                if (prop) {
                  setEditingName(prop.name)
                  setEditingDescription(prop.visualDetails)
                }
              } else if (assetCategory === AssetCategory.SCENE) {
                const scene = storeScenes.find(s => s.id === assetId)
                if (scene) {
                  setEditingName(scene.name)
                  setEditingDescription(scene.description)
                }
              }
              
              setSidebarAssetId(assetId)
              setSidebarAssetType(assetCategory as 'character' | 'prop' | 'scene')
              setIsAssetSidebarOpen(true)
              setAssetTab(assetCategory as 'character' | 'prop' | 'scene' | 'settings')
            }
          }}
          className={`inline-flex items-center px-2 py-1 rounded-md border cursor-pointer hover:opacity-80 transition-all ${tagColor}`}
          title={`点击编辑 ${match.asset.name}`}
        >
          {match.asset.name}
        </span>
      )
      
      lastIndex = match.end
    })
    
    // 添加剩余的文本
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${keyCounter++}`}>
          {text.substring(lastIndex)}
        </span>
      )
    }
    
    return parts.length > 0 ? parts : [<span key="text">{text}</span>]
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
            // 如果接口返回非 200 状态，立即停止并显示错误
            const errorData = await createResponse.json().catch(() => ({}))
            console.error(`场景 ${scene.sceneNumber} 创建任务失败:`, errorData.error)
            setSceneGenerationProgress(prev => ({
              ...prev,
              [scene.sceneNumber]: -1 // -1 表示失败
            }))
            // 显示错误提示
            setToastMessage(`场景 ${scene.sceneNumber}: 提示词解析失败`)
            setToastVisible(true)
            setTimeout(() => {
              setToastVisible(false)
            }, 5000)
            continue // 跳过当前场景，继续下一个（不进入后续轮询逻辑）
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
        // 如果接口返回非 200 状态，立即停止并显示错误
        const errorData = await createResponse.json().catch(() => ({}))
        throw new Error('提示词解析失败')
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
              createdAt: new Date(),
              projectId: currentProjectId,
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

  // 初始化剧本数据：优先从 localStorage 加载
  const [allScripts, setAllScripts] = useState<Script[]>(() => {
    const loadedScripts = loadScriptsFromStorage()
    return loadedScripts
  })
  
  // 过滤当前项目的剧本数据
  const scripts = allScripts.filter(script => script.projectId === currentProjectId)
  
  
  // 更新 scripts 的函数，同时更新 allScripts
  const setScripts = (updater: Script[] | ((prev: Script[]) => Script[])) => {
    if (typeof updater === 'function') {
      setAllScripts(prev => {
        const updated = updater(prev)
        saveScriptsToStorage(updated)
        return updated
      })
    } else {
      setAllScripts(updater)
      saveScriptsToStorage(updater)
    }
  }
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
      // 获取当前项目的艺术风格和文化背景
      const currentProject = getCurrentProject()
      const artStyle = currentProject?.artStyle || ''
      const culturalBackground = currentProject?.culturalBackground || ''
      
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          artStyle,
          culturalBackground,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '生成失败，请稍后重试')
      }

      const data = await response.json()
      console.log('API 返回的原始资产数据:', data.extracted_assets)
      const generatedScenes: Scene[] = data.scenes || []

      if (generatedScenes.length === 0) {
        throw new Error('未生成任何场景，请重试')
      }

      // 同步提取的资产到资产中心
      syncExtractedAssets(data.extracted_assets)

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
      // 获取当前项目的艺术风格和文化背景
      const currentProject = getCurrentProject()
      const artStyle = currentProject?.artStyle || ''
      const culturalBackground = currentProject?.culturalBackground || ''
      
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
          artStyle,
          culturalBackground,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '生成失败，请稍后重试')
      }

      const data = await response.json()
      console.log('API 返回的原始资产数据:', data.extracted_assets)
      const generatedScenes: Scene[] = data.scenes || []

      if (generatedScenes.length === 0) {
        throw new Error('未生成任何场景，请重试')
      }

      // 同步提取的资产到资产中心
      syncExtractedAssets(data.extracted_assets)

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

  // TTS 试听函数 - 使用 OpenAI TTS API
  const handlePlayTTS = async () => {
    if (!selectedCharacter) return

    setIsPlayingAudio(true)

    try {
      // 生成示例文本
      const sampleText = `你好，我是${selectedCharacter.name}，这是一段语音试听示例。当前语速为${editingSpeed}%，情感强度为${editingEmotion}%。`
      
      // 映射音色 ID：editingVoiceModel 已经是 voicePresets 中的 id
      // 'cold-male' → onyx, 'gentle-female' → shimmer, 'ai-mechanical' → alloy
      // 如果 editingVoiceModel 不在预设中，使用默认值
      const voiceId = editingVoiceModel || 'gentle-female'

      // 调用 TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sampleText,
          voiceId: voiceId,
          model: 'tts-1', // 使用 tts-1 模型（快速）
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'TTS 生成失败')
      }

      // 获取音频流
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // 创建 Audio 对象并播放
      const audio = new Audio(audioUrl)
      audio.volume = 1
      
      audio.onended = () => {
        setIsPlayingAudio(false)
        URL.revokeObjectURL(audioUrl) // 清理 URL
      }
      
      audio.onerror = () => {
        console.error('Audio playback error')
        setIsPlayingAudio(false)
        URL.revokeObjectURL(audioUrl)
        alert('音频播放失败，请检查网络连接或浏览器支持')
      }
      
      await audio.play()
    } catch (error: any) {
      console.error('TTS 生成失败:', error)
      setIsPlayingAudio(false)
      alert(error.message || 'TTS 生成失败，请检查 API 配置')
    }
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
      
      // 将解析出的角色添加到资产中心（使用 Zustand store）
      const store = useAssetStore.getState()
      const currentChars = store.characters.filter(char => char.projectId === currentProjectId)
      mockResult.coreAssets.characters.forEach((charName: string) => {
        // 检查是否已存在同名角色
        const existingChar = currentChars.find(c => c.name === charName)
        if (!existingChar) {
          // 如果不存在，添加到 store
          store.addCharacter({
            name: charName,
            description: `A detailed character design for ${charName}, high quality, professional`
          })
        }
      })
    }, 3000)
  }

  // 获取当前项目信息
  const currentProject = getCurrentProject()
  
  // 获取每个项目的第一张分镜图（从 localStorage 读取）
  const getProjectFirstStoryboardImage = (projectId: string | null): string | null => {
    if (!projectId || typeof window === 'undefined') return null
    try {
      // 从 localStorage 读取分镜数据
      const stored = localStorage.getItem('ai-video-platform-storyboards')
      if (!stored) return null
      
      const storyboards: StoryboardItem[] = JSON.parse(stored)
      const projectStoryboards = storyboards.filter(sb => sb.projectId === projectId)
      const firstStoryboard = projectStoryboards.find(sb => sb.imageUrl)
      return firstStoryboard?.imageUrl || null
    } catch {
      return null
    }
  }
  
  // 获取项目的分镜数量（从 localStorage 读取）
  const getProjectStoryboardCount = (projectId: string | null): number => {
    if (!projectId || typeof window === 'undefined') return 0
    try {
      const stored = localStorage.getItem('ai-video-platform-storyboards')
      if (!stored) return 0
      
      const storyboards: StoryboardItem[] = JSON.parse(stored)
      return storyboards.filter(sb => sb.projectId === projectId).length
    } catch {
      return 0
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden">
      {/* 顶栏导航 - Apple 风格 */}
      <header className="h-16 border-b border-[#E5E5E7] backdrop-blur-xl bg-white/80 flex items-center justify-between px-6 shadow-sm">
        {/* 左侧：项目名称（可点击切换） */}
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold flex items-center gap-2 text-[#1D1D1F]">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-white backdrop-blur-sm shadow-sm">AI</div>
            <span>Video Lab</span>
          </div>
          
          {/* 项目选择器 - 只有在挂载后才渲染依赖本地缓存的项目选择器 */}
          {mounted && (
            <div className="relative" ref={projectSelectorRef}>
              <button
                onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                className="px-4 py-2 bg-white/60 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-sm hover:bg-white/80 transition-all flex items-center gap-2 group min-w-0"
              >
                <Folder size={16} className="text-gray-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                  {currentProject?.name || '选择项目'}
                </span>
                <ChevronDown 
                  size={14} 
                  className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                    isProjectSelectorOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {/* 项目选择下拉菜单 - 确保在 mounted 且 isProjectSelectorOpen 为 true 时渲染 */}
              {/* 注意：即使 storeHydrated 为 false，也尝试渲染，避免阻塞 */}
              <AnimatePresence>
                {mounted && isProjectSelectorOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute z-50 mt-2 w-64 bg-white/60 backdrop-blur-xl border border-gray-200/50 rounded-xl shadow-xl"
                    style={{ overflow: 'visible' }}
                  >
                    <div 
                      className="max-h-64 overflow-y-auto rounded-xl" 
                      style={{ 
                        minHeight: 'auto',
                        maxHeight: '256px',
                        overflowY: 'auto',
                        overflowX: 'hidden'
                      }}
                    >
                      {/* 水合检查：确保数据从 localStorage 恢复后再显示 */}
                      {/* 如果未挂载，显示加载中；否则直接渲染项目列表 */}
                      {!mounted ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          加载中...
                        </div>
                      ) : (() => {
                        // 在下拉菜单打开时，强制从 store 获取最新数据（确保数据最新）
                        const latestProjects = useProjectStore.getState().projects
                        
                        // 调试日志：确认数据读取是否正确
                        console.log('📋 [下拉菜单渲染] 当前所有项目 (从 store 直接获取):', latestProjects)
                        console.log('📋 [下拉菜单渲染] 项目数量:', latestProjects.length)
                        console.log('📋 [下拉菜单渲染] projects 变量长度:', projects.length)
                        console.log('📋 [下拉菜单渲染] 当前项目 ID:', currentProjectId)
                        console.log('📋 [下拉菜单渲染] 项目详情:', latestProjects.map(p => ({ id: p.id, name: p.name })))
                        console.log('📋 [下拉菜单渲染] latestProjects 是否为数组:', Array.isArray(latestProjects))
                        console.log('📋 [下拉菜单渲染] latestProjects === projects:', latestProjects === projects)
                        
                        // 全量渲染：遍历 useProjectStore 中的所有项目（未过滤）
                        if (!latestProjects || !Array.isArray(latestProjects) || latestProjects.length === 0) {
                          console.warn('⚠️ [下拉菜单渲染] 项目列表为空或无效')
                          return (
                            <div className="px-4 py-6 text-center text-sm text-gray-500">
                              暂无项目
                            </div>
                          )
                        }
                        
                        console.log(`✅ [下拉菜单渲染] 准备渲染 ${latestProjects.length} 个项目`)
                        
                        // 直接创建项目按钮数组，不使用 Fragment
                        const projectButtons = latestProjects.map((project, index) => {
                          // 调试：输出每个项目的渲染信息
                          console.log(`  ✓ [${index + 1}/${latestProjects.length}] 渲染项目: ${project.name} (ID: ${project.id})`)
                          
                          return (
                            <button
                              key={`project-${project.id}-${index}`}
                              onClick={() => {
                                console.log(`🖱️ 点击项目: ${project.name} (ID: ${project.id})`)
                                // 更新 prevProjectIdRef 以便正确判断切换方向
                                prevProjectIdRef.current = currentProjectId
                                
                                // 切换清理：点击时清空当前工作区状态
                                setStoryText('')
                                setSelectedScript(null)
                                setAnalysisResult(null)
                                
                                // 点击事件：切换项目并关闭下拉菜单
                                setCurrentProject(project.id)
                                setIsProjectSelectorOpen(false)
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-white/80 transition-colors flex items-center justify-between group ${
                                currentProjectId === project.id ? 'bg-cyan-500/10' : ''
                              }`}
                              style={{ 
                                display: 'flex',
                                width: '100%',
                                minHeight: '48px',
                                opacity: 1,
                                visibility: 'visible'
                              }}
                            >
                              {/* 项目信息 - 支持 truncate */}
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="text-sm font-medium text-gray-800 truncate">
                                  {project.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 truncate">
                                  {project.artStyle || '未设置'} · {project.culturalBackground || '未设置'}
                                </div>
                              </div>
                              {/* 视觉反馈：当前选中的项目显示 CheckCircle 图标 */}
                              {currentProjectId === project.id && (
                                <CheckCircle 
                                  size={16} 
                                  className="text-cyan-500 flex-shrink-0 ml-2" 
                                  strokeWidth={2.5}
                                />
                              )}
                            </button>
                          )
                        })
                        
                        console.log(`✅ [下拉菜单渲染] 已创建 ${projectButtons.length} 个按钮元素`)
                        console.log(`✅ [下拉菜单渲染] projectButtons 数组内容:`, projectButtons.map((btn, i) => `按钮${i + 1}`))
                        
                        return (
                          <div>
                            {/* 调试信息：显示项目数量（仅在开发环境） */}
                            {process.env.NODE_ENV === 'development' && (
                              <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-200/30">
                                共 {projectButtons.length} 个项目
                              </div>
                            )}
                            {/* 渲染项目列表 - 直接使用从 store 获取的最新数据（全量，未过滤） */}
                            {projectButtons}
                            {/* 新建项目按钮 */}
                            <div className="border-t border-gray-200/50">
                              <button
                                onClick={() => {
                                  setIsProjectSelectorOpen(false)
                                  setIsCreatingProject(true)
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-white/80 transition-colors flex items-center gap-2 text-sm text-gray-700"
                              >
                                <PlusIcon size={16} />
                                <span>新建项目</span>
                              </button>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        
        {/* 右侧：艺术风格标签 - 只有在挂载后才渲染 */}
        {mounted && currentProject && (
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-sm font-medium border border-cyan-200/50">
              {currentProject.artStyle || '未设置'}
            </span>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏导航 - Apple 风格 */}
        <aside className="w-64 border-r border-[#E5E5E7] backdrop-blur-xl bg-[#FFFFFF] flex flex-col p-4 space-y-2 shadow-sm">
          <nav className="flex-1">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all backdrop-blur-sm ${
                  currentStep === step.id 
                  ? 'bg-cyan-500/10 text-cyan-600 border border-[#E5E5E7] shadow-sm' 
                  : 'text-[#86868B] hover:bg-[#F5F5F7] border border-transparent'
                }`}
              >
                {step.icon}
                <span className="font-medium">{step.name}</span>
              </button>
            ))}
          </nav>
        </aside>

      {/* 新建项目模态框 */}
      <AnimatePresence>
        {isCreatingProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setIsCreatingProject(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-2xl p-6 w-full max-w-md mx-4"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">新建项目</h2>
              
              <div className="space-y-6">
                {/* 项目名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目名称
                  </label>
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="输入项目名称"
                    className="w-full"
                  />
                </div>
                
                {/* 艺术风格 - 带快速选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    艺术风格
                  </label>
                  <Input
                    value={newProjectArtStyle}
                    onChange={(e) => setNewProjectArtStyle(e.target.value)}
                    placeholder="选择或输入艺术风格"
                    className="w-full mb-3"
                  />
                  {/* 快速选择区域 - Apple 风格浅色卡片 */}
                  <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4">
                    <div className="flex flex-wrap gap-2">
                      {artStyles.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setNewProjectArtStyle(style.name)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                            newProjectArtStyle === style.name
                              ? `${style.color} border-current shadow-sm scale-105`
                              : 'bg-white/60 text-gray-700 border-gray-300/50 hover:bg-cyan-500/10 hover:border-cyan-300/50'
                          }`}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* 文化背景 - 带快速选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文化背景
                  </label>
                  <Input
                    value={newProjectCulturalBg}
                    onChange={(e) => setNewProjectCulturalBg(e.target.value)}
                    placeholder="选择或输入文化背景"
                    className="w-full mb-3"
                  />
                  {/* 快速选择区域 - Apple 风格浅色卡片 */}
                  <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4">
                    <div className="flex flex-wrap gap-2">
                      {culturalBackgrounds.map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => setNewProjectCulturalBg(bg.name)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                            newProjectCulturalBg === bg.name
                              ? `${bg.color} border-current shadow-sm scale-105`
                              : 'bg-white/60 text-gray-700 border-gray-300/50 hover:bg-cyan-500/10 hover:border-cyan-300/50'
                          }`}
                        >
                          {bg.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    // 验证必填项
                    if (!newProjectName.trim()) {
                      alert('请输入项目名称')
                      return
                    }
                    if (!newProjectArtStyle.trim()) {
                      alert('请输入艺术风格')
                      return
                    }
                    if (!newProjectCulturalBg.trim()) {
                      alert('请输入文化背景')
                      return
                    }
                    
                    const projectId = addProject({
                      name: newProjectName.trim(),
                      artStyle: newProjectArtStyle.trim(),
                      culturalBackground: newProjectCulturalBg.trim(),
                    })
                    setCurrentProject(projectId)
                    setIsCreatingProject(false)
                    setNewProjectName('')
                    setNewProjectArtStyle('')
                    setNewProjectCulturalBg('')
                  }}
                  className="flex-1"
                >
                  创建
                </Button>
                <Button
                  onClick={() => {
                    setIsCreatingProject(false)
                    setNewProjectName('')
                    setNewProjectArtStyle('')
                    setNewProjectCulturalBg('')
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主操作区 - Apple 风格 */}
      <main className="flex-1 relative flex flex-col overflow-hidden bg-[#F5F5F7] text-[#1D1D1F]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProjectId || 'no-project'}
            initial={{ 
              opacity: 0, 
              x: transitionDirection === 'right' ? 50 : -50 
            }}
            animate={{ 
              opacity: isProjectTransitioning ? 0.7 : 1, 
              x: 0 
            }}
            exit={{ 
              opacity: 0, 
              x: transitionDirection === 'right' ? -50 : 50 
            }}
            transition={{ 
              duration: 0.3, 
              ease: [0.4, 0, 0.2, 1] // iOS 风格的缓动函数
            }}
            className="flex-1 overflow-hidden"
          >
            {currentStep === 'overview' && (
              <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <div className="max-w-7xl mx-auto px-8 py-12">
                  {/* 标题区域 - Apple 风格 */}
                  <div className="mb-12 text-center">
                    <h1 
                      className="text-5xl font-bold tracking-tight text-[#1D1D1F] mb-3" 
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}
                    >
                      选择项目
                    </h1>
                    <p 
                      className="text-xl text-[#86868B] max-w-2xl mx-auto" 
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}
                    >
                      选择一个项目开始创作，或创建新项目
                    </p>
                  </div>

                  {/* 项目列表 - Apple 风格 */}
                  {projects.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center min-h-[60vh]"
                    >
                      <div className="text-center max-w-md">
                        <div className="w-24 h-24 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <Folder size={48} className="text-cyan-600" />
                        </div>
                        <h3 
                          className="text-2xl font-semibold text-gray-800 mb-3"
                          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}
                        >
                          还没有项目
                        </h3>
                        <p className="text-gray-600 mb-8 text-lg">
                          创建您的第一个项目，开始您的 AI 视频创作之旅
                        </p>
                        <Button
                          onClick={() => setIsCreatingProject(true)}
                          variant="primary"
                          size="lg"
                          icon={Plus}
                          className="shadow-lg"
                        >
                          创建新项目
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {projects.map((project, index) => {
                        const projectImage = getProjectFirstStoryboardImage(project.id)
                        const projectScripts = allScripts.filter((s: Script) => s.projectId === project.id)
                        const projectStoryboardsCount = getProjectStoryboardCount(project.id)
                        const isSelected = currentProjectId === project.id
                        
                        return (
                          <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            onClick={() => {
                              // 更新 prevProjectIdRef 以便正确判断切换方向
                              prevProjectIdRef.current = currentProjectId
                              setCurrentProject(project.id)
                            }}
                            className={`group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 ${
                              isSelected 
                                ? 'ring-4 ring-cyan-500/50 shadow-2xl scale-[1.02]' 
                                : 'shadow-lg hover:shadow-2xl hover:scale-[1.01]'
                            }`}
                          >
                            {/* 背景图片（模糊处理） */}
                            <div className="relative h-48 overflow-hidden">
                              <div 
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                style={{
                                  backgroundImage: projectImage 
                                    ? `url(${projectImage})` 
                                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  filter: 'blur(30px)',
                                  transform: 'scale(1.2)',
                                }}
                              />
                              <div className={`absolute inset-0 transition-colors ${
                                isSelected ? 'bg-cyan-500/30' : 'bg-black/30 group-hover:bg-black/40'
                              }`} />
                              
                              {/* 选中指示器 */}
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute top-4 right-4"
                                >
                                  <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center shadow-xl">
                                    <CheckCircle size={24} className="text-white" />
                                  </div>
                                </motion.div>
                              )}
                            </div>
                            
                            {/* 内容层 */}
                            <div className="bg-white/95 backdrop-blur-xl p-6 border-t border-gray-100 relative">
                              {/* 项目名称 */}
                              <h3 
                                className="text-xl font-bold text-gray-900 mb-3 truncate" 
                                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}
                              >
                                {project.name}
                              </h3>
                              
                              {/* 艺术风格和文化背景 - 必填项 */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                <span className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-xl text-sm font-medium border border-cyan-200/50">
                                  {project.artStyle || '未设置'}
                                </span>
                                <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium border border-purple-200/50">
                                  {project.culturalBackground || '未设置'}
                                </span>
                              </div>
                              
                              {/* 项目统计 */}
                              <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <FileText size={16} className="text-gray-400" />
                                  <span className="font-medium">{projectScripts.length}</span>
                                  <span>剧本</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <LayoutGrid size={16} className="text-gray-400" />
                                  <span className="font-medium">{projectStoryboardsCount}</span>
                                  <span>分镜</span>
                                </div>
                              </div>
                              
                              {/* 悬停显示最后修改时间 */}
                              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="px-3 py-1.5 bg-black/80 backdrop-blur-sm text-white text-xs rounded-lg shadow-lg flex items-center gap-2">
                                  <Clock size={12} />
                                  <span>
                                    {project.updatedAt 
                                      ? `修改于 ${new Date(project.updatedAt).toLocaleString('zh-CN', { 
                                          year: 'numeric', 
                                          month: '2-digit', 
                                          day: '2-digit', 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}`
                                      : project.createdAt 
                                        ? `创建于 ${new Date(project.createdAt).toLocaleString('zh-CN', { 
                                            year: 'numeric', 
                                            month: '2-digit', 
                                            day: '2-digit', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}`
                                        : '未知时间'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                      
                      {/* 创建新项目卡片 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: projects.length * 0.05 }}
                        onClick={() => setIsCreatingProject(true)}
                        className="group relative rounded-3xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-cyan-500 transition-all duration-300 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center min-h-[300px] hover:shadow-xl"
                      >
                        <div className="text-center p-8">
                          <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-cyan-200 group-hover:to-blue-200 transition-colors shadow-lg">
                            <PlusIcon size={40} className="text-cyan-600" />
                          </div>
                          <h3 
                            className="text-xl font-semibold text-gray-800 mb-2"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}
                          >
                            创建新项目
                          </h3>
                          <p className="text-gray-500 text-sm">
                            开始新的创作之旅
                          </p>
                        </div>
                      </motion.div>
                  </div>
                  )}
                </div>
              </div>
            )}

        {/* 故事改编界面 */}
        {currentStep === 'story' && (
          !currentProjectId ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Folder size={48} className="text-cyan-600" />
                </div>
                <h3 
                  className="text-2xl font-semibold text-gray-800 mb-3"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}
                >
                  请先选择项目
                </h3>
                <p className="text-gray-600 mb-8 text-lg">
                  在开始故事改编之前，请先在项目中心选择一个项目
                </p>
                <Button
                  onClick={() => setCurrentStep('overview')}
                  variant="primary"
                  size="lg"
                  icon={HomeIcon}
                >
                  前往项目中心
                </Button>
              </div>
            </div>
          ) : (
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
          )
        )}

        {/* 资产中心界面 */}
        {currentStep === 'assets' && (
          <AssetCenter
            currentProjectId={currentProjectId}
            onNavigateToOverview={() => setCurrentStep('overview')}
            selectedScript={selectedScript}
            generatingImageId={generatingImageId}
            onGenerateAssetImage={handleGenerateAssetImage}
          />
        )}

        {/* 分镜管理界面 */}
        {currentStep === 'storyboard' && (
          <StoryboardManagement
            currentProjectId={currentProjectId}
            storeCharacters={storeCharacters}
            storeProps={storeProps}
            storeScenes={storeScenes}
            selectedScript={selectedScript}
            scripts={scripts} // 传递所有剧本列表，用于自动关联
            onNavigateToOverview={() => setCurrentStep('overview')}
            onNavigateToAssets={() => setCurrentStep('assets')} // 导航到资产中心
            onSelectScript={setSelectedScript} // 传递选择剧本的回调
          />
        )}

        {/* 剧本管理界面 */}
        {currentStep === 'script' && (
          <ScriptManagement
            currentProjectId={currentProjectId}
            scripts={scripts}
            setScripts={setScripts}
            onNavigateToOverview={() => setCurrentStep('overview')}
            onNavigateToStoryboard={() => setCurrentStep('storyboard')}
            syncExtractedAssets={syncExtractedAssets}
            renderTextWithAssetTags={renderTextWithAssetTags}
            buildEnhancedPrompt={buildEnhancedPrompt}
            handleBatchGenerateStoryboards={handleBatchGenerateStoryboards}
            isBatchGenerating={isBatchGenerating}
            sceneGenerationProgress={sceneGenerationProgress}
          />
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

              {/* 分镜列表预览 - 从 localStorage 读取 */}
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-300/50 p-6 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">分镜列表</h2>
                
                <div className="space-y-4">
                  {(() => {
                    // 从 localStorage 读取分镜数据
                    if (typeof window === 'undefined') return null
                    try {
                      const stored = localStorage.getItem('ai-video-platform-storyboards')
                      if (!stored) return <div className="text-sm text-gray-500 text-center py-4">暂无分镜数据</div>
                      
                      const storyboards: StoryboardItem[] = JSON.parse(stored)
                      const projectStoryboards = storyboards.filter(sb => sb.projectId === currentProjectId)
                      
                      if (projectStoryboards.length === 0) {
                        return <div className="text-sm text-gray-500 text-center py-4">暂无分镜数据</div>
                      }
                      
                      return projectStoryboards.map((storyboard: StoryboardItem, index: number) => {
                        // 支持多个角色：获取所有选中的角色
                        const store = useAssetStore.getState()
                        const allAssets = [
                          ...store.getAssetsByCategory(AssetCategory.CHARACTER),
                          ...store.getAssetsByCategory(AssetCategory.PROP),
                          ...store.getAssetsByCategory(AssetCategory.SCENE),
                        ]
                        const characters = storyboard.characterIds
                          .map((id: string) => allAssets.find((a: any) => a.id === id))
                          .filter((a): a is NonNullable<typeof a> => a !== undefined)
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
                                  <span className="font-medium">角色:</span> {characters.length > 0 ? characters.map((c: any) => c.name).join(', ') : '未选择'}
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
                      })
                    } catch {
                      return <div className="text-sm text-gray-500 text-center py-4">加载分镜数据失败</div>
                    }
                  })()}
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

      {/* 资产编辑侧边栏 */}
      {isAssetSidebarOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsAssetSidebarOpen(false)}
          />
          
          {/* 侧边栏 */}
          <div
            className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
              isAssetSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex flex-col h-full">
              {/* 侧边栏头部 */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">编辑资产</h2>
                <button
                  onClick={() => setIsAssetSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="关闭"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              
              {/* 侧边栏内容 */}
              <div className="flex-1 overflow-y-auto p-6">
                {sidebarAssetId && sidebarAssetType && (
                  <>
                    {/* 角色编辑 */}
                    {sidebarAssetType === 'character' && (() => {
                      const character = storeCharacters.find(c => c.id === sidebarAssetId)
                      if (!character) return <div className="text-gray-500">资产不存在</div>
                      
                      // 试听 TTS 的函数
                      const handlePreviewVoice = async () => {
                        setIsPlayingCharacterVoice(true)
                        try {
                          const testText = `你好，我是${editingName || character.name}的声音`
                          
                          const response = await fetch('/api/tts', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              text: testText,
                              voiceId: editingCharacterVoiceId,
                              model: 'tts-1',
                            }),
                          })

                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}))
                            throw new Error(errorData.error || 'TTS 生成失败')
                          }

                          const audioBlob = await response.blob()
                          const audioUrl = URL.createObjectURL(audioBlob)
                          const audio = new Audio(audioUrl)
                          
                          audio.onended = () => {
                            setIsPlayingCharacterVoice(false)
                            URL.revokeObjectURL(audioUrl)
                          }
                          
                          audio.onerror = () => {
                            setIsPlayingCharacterVoice(false)
                            URL.revokeObjectURL(audioUrl)
                            alert('音频播放失败')
                          }
                          
                          await audio.play()
                        } catch (error: any) {
                          console.error('TTS 试听失败:', error)
                          setIsPlayingCharacterVoice(false)
                          alert(error.message || 'TTS 试听失败，请检查 API 配置')
                        }
                      }
                      
                      return (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">角色名称</label>
                            <Input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">角色描述</label>
                            <Textarea
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              className="w-full"
                              rows={5}
                              placeholder="输入角色描述..."
                            />
                          </div>
                          
                          {/* 语音选择器 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              语音音色
                            </label>
                            <div className="flex gap-2">
                              <select
                                value={editingCharacterVoiceId}
                                onChange={(e) => setEditingCharacterVoiceId(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              >
                                {openAIVoiceOptions.map((voice) => (
                                  <option key={voice.id} value={voice.id}>
                                    {voice.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={handlePreviewVoice}
                                disabled={isPlayingCharacterVoice}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                                title="试听语音"
                              >
                                {isPlayingCharacterVoice ? (
                                  <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-sm">播放中</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 size={16} />
                                    <span className="text-sm">试听</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {openAIVoiceOptions.find(v => v.id === editingCharacterVoiceId)?.description || ''}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                updateCharacter(sidebarAssetId, {
                                  name: editingName,
                                  description: editingDescription,
                                  voiceId: editingCharacterVoiceId, // 资产隔离：保存 voiceId 到角色模型
                                })
                                setIsAssetSidebarOpen(false)
                                setSidebarAssetId(null)
                                setSidebarAssetType(null)
                              }}
                              variant="primary"
                              fullWidth
                            >
                              保存
                            </Button>
                            <Button
                              onClick={() => {
                                setIsAssetSidebarOpen(false)
                                setSidebarAssetId(null)
                                setSidebarAssetType(null)
                              }}
                              variant="secondary"
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      )
                    })()}
                    
                    {/* 道具编辑 */}
                    {sidebarAssetType === 'prop' && (() => {
                      const prop = storeProps.find(p => p.id === sidebarAssetId)
                      if (!prop) return <div className="text-gray-500">资产不存在</div>
                      
                      return (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">道具名称</label>
                            <Input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">视觉细节</label>
                            <Textarea
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              className="w-full"
                              rows={5}
                              placeholder="输入道具的视觉细节..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                updateProp(sidebarAssetId, {
                                  name: editingName,
                                  visualDetails: editingDescription,
                                })
                                setIsAssetSidebarOpen(false)
                                setSidebarAssetId(null)
                                setSidebarAssetType(null)
                              }}
                              variant="primary"
                              fullWidth
                            >
                              保存
                            </Button>
                            <Button
                              onClick={() => {
                                setIsAssetSidebarOpen(false)
                                setSidebarAssetId(null)
                                setSidebarAssetType(null)
                              }}
                              variant="secondary"
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      )
                    })()}
                    
                    {/* 场景编辑 */}
                    {sidebarAssetType === 'scene' && (() => {
                      const scene = storeScenes.find(s => s.id === sidebarAssetId)
                      if (!scene) return <div className="text-gray-500">资产不存在</div>
                      
                      return (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">场景名称</label>
                            <Input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">场景描述</label>
                            <Textarea
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              className="w-full"
                              rows={5}
                              placeholder="输入场景描述..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                updateScene(sidebarAssetId, {
                                  name: editingName,
                                  description: editingDescription,
                                })
                                setIsAssetSidebarOpen(false)
                                setSidebarAssetId(null)
                                setSidebarAssetType(null)
                              }}
                              variant="primary"
                              fullWidth
                            >
                              保存
                            </Button>
                            <Button
                              onClick={() => {
                                setIsAssetSidebarOpen(false)
                                setSidebarAssetId(null)
                                setSidebarAssetType(null)
                              }}
                              variant="secondary"
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      </motion.div>
    </AnimatePresence>
  </main>
  </div>

  {/* 右下角环境指示器 - 只有在挂载后才渲染 */}
  {mounted && currentProject && (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-6 right-6 z-40"
    >
      <div className="px-4 py-2.5 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-lg flex items-center gap-3">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
        <div className="text-sm font-medium text-gray-700" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}>
          <span className="text-gray-600">{currentProject?.artStyle || '未设置'}</span>
          <span className="mx-2 text-gray-400">|</span>
          <span className="text-gray-600">{currentProject?.culturalBackground || '未设置'}</span>
        </div>
      </div>
    </motion.div>
  )}
    </div>
  )
}