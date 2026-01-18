'use client'

import React, { useState, useEffect } from 'react'
import { useAssetStore } from '@/store/useAssetStore'
import { AssetCategory } from '@/types/assets'
import { Card, Button, Input, Textarea } from '@/app/components'
import { 
  User, 
  MapPin, 
  Box, 
  Save, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Loader2,
  Image,
  Folder,
  Volume2
} from 'lucide-react'

interface AssetCenterProps {
  currentProjectId: string | null
  onNavigateToOverview: () => void
  selectedScript: any // Script | null
  generatingImageId: string | null
  onGenerateAssetImage: (id: string, description: string, category: 'character' | 'prop' | 'scene') => void
}

export default function AssetCenter({
  currentProjectId,
  onNavigateToOverview,
  selectedScript,
  generatingImageId,
  onGenerateAssetImage
}: AssetCenterProps) {
  // 从 Zustand Store 获取资产数据
  const allCharacters = useAssetStore((state) => state.characters)
  const allProps = useAssetStore((state) => state.props)
  const allScenes = useAssetStore((state) => state.scenes)
  const storeTheme = useAssetStore((state) => state.theme)
  
  // 过滤当前项目的资产数据
  const storeCharacters = allCharacters.filter(char => char.projectId === currentProjectId)
  const storeProps = allProps.filter(prop => prop.projectId === currentProjectId)
  const storeScenes = allScenes.filter(scene => scene.projectId === currentProjectId)
  
  const updateCharacter = useAssetStore((state) => state.updateCharacter)
  const updateProp = useAssetStore((state) => state.updateProp)
  const updateScene = useAssetStore((state) => state.updateScene)
  const setTheme = useAssetStore((state) => state.setTheme)
  const removeCharacter = useAssetStore((state) => state.removeCharacter)
  const removeProp = useAssetStore((state) => state.removeProp)
  const removeScene = useAssetStore((state) => state.removeScene)

  // 资产中心相关状态
  const [assetTab, setAssetTab] = useState<'character' | 'prop' | 'scene' | 'settings'>('character')
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [editingAssetType, setEditingAssetType] = useState<'character' | 'prop' | 'scene' | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  
  // 角色音色编辑状态（资产隔离）
  const [editingCharacterVoiceId, setEditingCharacterVoiceId] = useState<string>('shimmer')
  const [isPlayingCharacterVoice, setIsPlayingCharacterVoice] = useState(false)
  
  // OpenAI 标准音色选项（6 种）
  const openAIVoiceOptions = [
    { id: 'alloy', name: 'Alloy（中性、清晰）', description: '中性音色，清晰自然' },
    { id: 'echo', name: 'Echo（回声）', description: '回声效果音色' },
    { id: 'fable', name: 'Fable（寓言）', description: '温暖叙事音色' },
    { id: 'onyx', name: 'Onyx（深沉男声）', description: '深沉磁性男声' },
    { id: 'nova', name: 'Nova（年轻女声）', description: '年轻活力女声' },
    { id: 'shimmer', name: 'Shimmer（温暖女声）', description: '温暖清晰女声' },
  ]

  /**
   * 计算资产在当前选中剧本中的引用次数
   */
  const getAssetReferenceCount = (assetName: string, category: AssetCategory): number => {
    if (!selectedScript) return 0
    
    let count = 0
    selectedScript.scenes.forEach((scene: any) => {
      const sceneText = `${scene.content} ${scene.dialogue}`.toLowerCase()
      const assetNameLower = assetName.toLowerCase()
      
      const matches = sceneText.match(new RegExp(assetNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
      if (matches) {
        count += matches.length
      }
    })
    
    return count
  }

  /**
   * 获取资产的静态图 URL
   */
  const getAssetImageUrl = (asset: { referenceImageUrl?: string | null; category: AssetCategory }): string | null => {
    if (asset.referenceImageUrl) {
      return asset.referenceImageUrl
    }
    
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

  if (!currentProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Folder size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">请先选择项目</h3>
          <p className="text-gray-600">请在项目中心创建或选择一个项目后，再管理资产</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white text-gray-900">
      {/* 资产分类导航 - Apple 风格 Tab 切换 */}
      <div className="relative flex gap-2 p-4 border-b border-gray-300/50 bg-white/80 backdrop-blur-sm">
        <button
          onClick={() => {
            setAssetTab('character')
            setEditingAssetId(null)
            setEditingAssetType(null)
          }}
          className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ease-in-out ${
            assetTab === 'character'
              ? 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/50 shadow-sm'
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
          className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ease-in-out ${
            assetTab === 'prop'
              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/50 shadow-sm'
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
          className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ease-in-out ${
            assetTab === 'scene'
              ? 'bg-green-500/10 text-green-600 border border-green-500/50 shadow-sm'
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

      {/* 主内容区域 - 平滑切换动画 */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        {/* 角色 Tab */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            assetTab === 'character'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
          }`}
        >
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
                  {storeCharacters.map((character) => {
                    const store = useAssetStore.getState()
                    const assets = store.getAssetsByCategory(AssetCategory.CHARACTER)
                    const asset = assets.find(a => a.name === character.name)
                    const imageUrl = asset ? getAssetImageUrl(asset) : getAssetImageUrl({ category: AssetCategory.CHARACTER })
                    const referenceCount = getAssetReferenceCount(character.name, AssetCategory.CHARACTER)
                    
                    return (
                      <Card
                        key={character.id}
                        className="hover:shadow-apple-lg transition-all cursor-pointer"
                        padding="lg"
                      >
                        {/* 参考图 */}
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
                          {/* 引用计数徽章 */}
                          {referenceCount > 0 && (
                            <div className="absolute top-2 right-2 bg-[#007AFF] text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                              {referenceCount}
                            </div>
                          )}
                          {generatingImageId === character.id && (
                            <div className="absolute inset-0 backdrop-blur-md bg-white/70 border border-white/50 flex flex-col items-center justify-center rounded-apple-lg shadow-apple-lg z-10">
                              <Loader2 size={32} className="text-[#1D1D1F] animate-spin mb-3" />
                              <span className="text-sm font-medium text-[#1D1D1F] animate-pulse">正在构思视觉元素...</span>
                            </div>
                          )}
                        </div>
                        
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
                        
                        {/* 语音音色选择器（仅角色类型，仅在编辑模式下显示） */}
                        {editingAssetId === character.id && editingAssetType === 'character' && (
                          <div className="mb-4">
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
                                onClick={async () => {
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
                                }}
                                disabled={isPlayingCharacterVoice}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                                title="试听语音"
                              >
                                {isPlayingCharacterVoice ? (
                                  <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>播放中</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 size={16} />
                                    <span>试听</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {openAIVoiceOptions.find(v => v.id === editingCharacterVoiceId)?.description || ''}
                            </p>
                          </div>
                        )}
                        
                        {/* 操作按钮 */}
                        <div className="flex flex-col gap-2">
                          {editingAssetId === character.id && editingAssetType === 'character' ? (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  updateCharacter(character.id, {
                                    name: editingName,
                                    description: editingDescription,
                                    voiceId: editingCharacterVoiceId, // 资产隔离：保存 voiceId
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
                                icon={Trash2}
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
                                    // 资产隔离：初始化音色选择（从角色的 voiceId 读取）
                                    const voiceId = (character as any).voiceId || 'shimmer'
                                    setEditingCharacterVoiceId(voiceId)
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
                                onClick={() => onGenerateAssetImage(character.id, character.description, 'character')}
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
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 道具 Tab */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            assetTab === 'prop'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
          }`}
        >
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
                  {storeProps.map((prop) => {
                    const store = useAssetStore.getState()
                    const assets = store.getAssetsByCategory(AssetCategory.PROP)
                    const asset = assets.find(a => a.name === prop.name)
                    const imageUrl = asset ? getAssetImageUrl(asset) : getAssetImageUrl({ category: AssetCategory.PROP })
                    const referenceCount = getAssetReferenceCount(prop.name, AssetCategory.PROP)
                    
                    return (
                      <Card
                        key={prop.id}
                        className="hover:shadow-apple-lg transition-all cursor-pointer"
                        padding="lg"
                      >
                        {/* 参考图 */}
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
                          {/* 引用计数徽章 */}
                          {referenceCount > 0 && (
                            <div className="absolute top-2 right-2 bg-[#007AFF] text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                              {referenceCount}
                            </div>
                          )}
                          {generatingImageId === prop.id && (
                            <div className="absolute inset-0 backdrop-blur-md bg-white/70 border border-white/50 flex flex-col items-center justify-center rounded-apple-lg shadow-apple-lg z-10">
                              <Loader2 size={32} className="text-[#1D1D1F] animate-spin mb-3" />
                              <span className="text-sm font-medium text-[#1D1D1F] animate-pulse">正在构思视觉元素...</span>
                            </div>
                          )}
                        </div>
                        
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
                                icon={Trash2}
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
                                onClick={() => onGenerateAssetImage(prop.id, prop.visualDetails, 'prop')}
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
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 场景 Tab */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            assetTab === 'scene'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
          }`}
        >
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
                  {storeScenes.map((scene) => {
                    const store = useAssetStore.getState()
                    const assets = store.getAssetsByCategory(AssetCategory.SCENE)
                    const asset = assets.find(a => a.name === scene.name)
                    const imageUrl = asset ? getAssetImageUrl(asset) : getAssetImageUrl({ category: AssetCategory.SCENE })
                    const referenceCount = getAssetReferenceCount(scene.name, AssetCategory.SCENE)
                    
                    return (
                      <Card
                        key={scene.id}
                        className="hover:shadow-apple-lg transition-all cursor-pointer"
                        padding="lg"
                      >
                        {/* 参考图 */}
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
                          {/* 引用计数徽章 */}
                          {referenceCount > 0 && (
                            <div className="absolute top-2 right-2 bg-[#007AFF] text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                              {referenceCount}
                            </div>
                          )}
                          {generatingImageId === scene.id && (
                            <div className="absolute inset-0 backdrop-blur-md bg-white/70 border border-white/50 flex flex-col items-center justify-center rounded-apple-lg shadow-apple-lg z-10">
                              <Loader2 size={32} className="text-[#1D1D1F] animate-spin mb-3" />
                              <span className="text-sm font-medium text-[#1D1D1F] animate-pulse">正在构思视觉元素...</span>
                            </div>
                          )}
                        </div>
                        
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
                                icon={Trash2}
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
                                onClick={() => onGenerateAssetImage(scene.id, scene.description, 'scene')}
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
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 全局设置 Tab */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            assetTab === 'settings'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
          }`}
        >
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
    </div>
  )
}
