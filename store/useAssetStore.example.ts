/**
 * useAssetStore 使用示例
 * 
 * 这个文件展示了如何在组件中使用资产管理 Store
 */

import { useAssetStore } from './useAssetStore'

// 示例 1: 在组件中使用 Store
export function ExampleComponent() {
  // 获取状态
  const characters = useAssetStore((state) => state.characters)
  const props = useAssetStore((state) => state.props)
  const scenes = useAssetStore((state) => state.scenes)
  const theme = useAssetStore((state) => state.theme)

  // 获取 Actions
  const addCharacter = useAssetStore((state) => state.addCharacter)
  const addAssetsFromStory = useAssetStore((state) => state.addAssetsFromStory)

  // 示例：从故事改编结果添加资产
  const handleAddFromStory = () => {
    const storyAssets = {
      characters: [
        { name: '赛博剑客', description: '身穿霓虹装甲的未来武士' },
        { name: 'AI 少女', description: '银色头发的机械少女' },
      ],
      props: [
        { name: '能量剑', description: '蓝色光刃，科技感十足' },
      ],
      scenes: [
        { name: '霓虹街头', description: '雨夜的未来都市街道' },
      ],
      theme: '赛博朋克',
    }

    // 自动去重并添加资产
    addAssetsFromStory(storyAssets)
  }

  return null
}

// 示例 2: 在非组件函数中使用（如 API 回调）
export function handleApiResponse(adaptation: any) {
  if (adaptation && adaptation.assets) {
    // 使用 getState() 在非组件环境中访问 store
    useAssetStore.getState().addAssetsFromStory(adaptation.assets)
  }
}
