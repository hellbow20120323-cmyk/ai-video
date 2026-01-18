'use client'

import React, { useState, useEffect } from 'react'
import { Script, Scene } from '@/types/script'
import { useProjectStore } from '@/store/useProjectStore'
import { useAssetStore } from '@/store/useAssetStore'
import { AssetCategory } from '@/types/assets'
import { Button } from '@/app/components'
import { 
  Search, 
  Plus, 
  Save, 
  Trash2, 
  ScrollText, 
  Sparkles as SparklesIcon,
  Loader2,
  Image,
  Volume2,
  Edit3,
  RefreshCw,
  LayoutGrid,
  Home as HomeIcon,
  Folder
} from 'lucide-react'

interface ScriptManagementProps {
  currentProjectId: string | null
  scripts: Script[]
  setScripts: (updater: Script[] | ((prev: Script[]) => Script[])) => void
  onNavigateToOverview: () => void
  onNavigateToStoryboard: () => void
  syncExtractedAssets: (extractedAssets: any) => void
  renderTextWithAssetTags: (text: string) => React.ReactNode[]
  buildEnhancedPrompt: (scene: Scene) => { prompt: string; referenceImageId?: string }
  handleBatchGenerateStoryboards: () => Promise<void>
  isBatchGenerating: boolean
  sceneGenerationProgress: Record<number, number>
}

export default function ScriptManagement({
  currentProjectId,
  scripts,
  setScripts,
  onNavigateToOverview,
  onNavigateToStoryboard,
  syncExtractedAssets,
  renderTextWithAssetTags,
  buildEnhancedPrompt,
  handleBatchGenerateStoryboards,
  isBatchGenerating,
  sceneGenerationProgress
}: ScriptManagementProps) {
  const getCurrentProject = useProjectStore((state) => state.getCurrentProject)
  
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

  // AI 生成场景
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !selectedScript || isGenerating) return

    setIsGenerating(true)
    try {
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

      syncExtractedAssets(data.extracted_assets)

      const startSceneNumber = selectedScript.scenes.length + 1
      const newScenes = generatedScenes.map((scene, index) => ({
        ...scene,
        sceneNumber: startSceneNumber + index,
      }))

      const updatedScript = {
        ...selectedScript,
        scenes: [...selectedScript.scenes, ...newScenes],
      }
      setSelectedScript(updatedScript)
      setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))

      setAiPrompt('')
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
      const currentProject = getCurrentProject()
      const artStyle = currentProject?.artStyle || ''
      const culturalBackground = currentProject?.culturalBackground || ''
      
      const prompt = `场景描述：${scene.content}\n对白：${scene.dialogue}`
      
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          singleScene: true,
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

      syncExtractedAssets(data.extracted_assets)

      const newScene = generatedScenes[0]
      const updatedScenes = [...selectedScript.scenes]
      updatedScenes[sceneIndex] = {
        ...newScene,
        sceneNumber: scene.sceneNumber,
      }

      const updatedScript = {
        ...selectedScript,
        scenes: updatedScenes,
      }
      setSelectedScript(updatedScript)
      setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s))

      alert('场景重新生成成功！')
    } catch (error: any) {
      console.error('重新生成场景失败:', error)
      alert(error.message || '重新生成失败，请稍后重试')
    } finally {
      setRegeneratingSceneIndex(null)
    }
  }

  if (!currentProjectId) {
    return (
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
            在管理剧本之前，请先在项目中心选择一个项目
          </p>
          <Button
            onClick={onNavigateToOverview}
            variant="primary"
            size="lg"
            icon={HomeIcon}
          >
            前往项目中心
          </Button>
        </div>
      </div>
    )
  }

  return (
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
                    icon={isBatchGenerating ? Loader2 : SparklesIcon}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  >
                    {isBatchGenerating ? '批量生成中...' : '批量生成分镜'}
                  </Button>
                  <button
                    onClick={() => {
                      setScripts(prev => prev.map(s => s.id === selectedScript.id ? selectedScript : s))
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

                          {/* 画面描述 (Visual) */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                              <Image size={16} />
                              画面描述 (Visual)
                            </label>
                            <div className="px-4 py-3 bg-slate-900/30 border border-slate-700/30 rounded-xl text-white text-sm min-h-[60px]">
                              {renderTextWithAssetTags(scene.content)}
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
                      const scenesData = selectedScript.scenes
                      try {
                        const dataToSave = {
                          scriptId: selectedScript.id,
                          scriptTitle: selectedScript.title,
                          scenes: scenesData,
                          timestamp: new Date().toISOString(),
                        }
                        localStorage.setItem('pending_storyboard_data', JSON.stringify(dataToSave))
                        onNavigateToStoryboard()
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
                    if (!newScriptTitle.trim()) {
                      alert('请输入剧本标题')
                      return
                    }
                    const newScript: Script = {
                      id: `script-${Date.now()}`,
                      title: newScriptTitle.trim(),
                      author: newScriptAuthor.trim() || '未知作者',
                      scenes: [],
                      createdAt: new Date(),
                      projectId: currentProjectId,
                    }
                    setScripts(prev => [...prev, newScript])
                    setSelectedScript(newScript)
                    setIsCreatingScript(false)
                    setNewScriptTitle('')
                    setNewScriptAuthor('')
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all"
                >
                  确认创建
                </button>
                <button
                  onClick={() => {
                    setIsCreatingScript(false)
                    setNewScriptTitle('')
                    setNewScriptAuthor('')
                  }}
                  className="px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-white rounded-xl font-medium transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
