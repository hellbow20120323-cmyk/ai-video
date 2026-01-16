/**
 * 统一资产管理 Store 使用示例
 * 展示如何使用 syncAssets 和 getAssetsByCategory 方法
 */

import { useAssetStore } from './useAssetStore'
import { Asset, AssetCategory } from '@/types/assets'

// ========== 示例 1: 使用 syncAssets 同步资产数组 ==========

/**
 * 示例：从 API 或外部数据源同步资产
 */
export function exampleSyncAssets() {
  // 获取 syncAssets 方法
  const syncAssets = useAssetStore.getState().syncAssets

  // 模拟从 API 获取的资产数据
  const assetsFromAPI: Asset[] = [
    {
      id: 'char-1',
      category: AssetCategory.CHARACTER,
      name: '赛博剑客',
      visualDescription: '一个身穿霓虹装甲的赛博朋克武士，手持发光武士刀，站在雨夜的霓虹街头',
      referenceImageUrl: 'https://example.com/images/cyber-samurai.jpg',
      createdAt: new Date(),
    },
    {
      id: 'prop-1',
      category: AssetCategory.PROP,
      name: '能量剑',
      visualDescription: '一把散发着蓝色光芒的能量剑，剑身由全息投影构成，边缘有电流闪烁',
      referenceImageUrl: 'https://example.com/images/energy-sword.jpg',
      createdAt: new Date(),
    },
    {
      id: 'scene-1',
      category: AssetCategory.SCENE,
      name: '霓虹街头',
      visualDescription: '雨夜的赛博朋克城市街道，霓虹灯广告牌闪烁，蒸汽从下水道升起，未来感十足',
      referenceImageUrl: 'https://example.com/images/neon-street.jpg',
      createdAt: new Date(),
    },
    {
      id: 'theme-1',
      category: AssetCategory.THEME,
      name: '赛博朋克',
      visualDescription: '高对比度的霓虹色彩，暗色调背景，强烈的光影对比，未来科技感',
      referenceImageUrl: null,
      createdAt: new Date(),
    },
  ]

  // 同步资产（自动去重）
  syncAssets(assetsFromAPI)
  console.log('资产已同步到 store')
}

// ========== 示例 2: 使用 getAssetsByCategory 获取特定类别的资产 ==========

/**
 * 示例：在 React 组件中使用
 */
export function AssetListComponent() {
  // 使用 Hook 获取资产和分类方法
  const assets = useAssetStore((state) => state.assets)
  const getAssetsByCategory = useAssetStore((state) => state.getAssetsByCategory)

  // 获取所有角色资产
  const characters = getAssetsByCategory(AssetCategory.CHARACTER)
  
  // 获取所有道具资产
  const props = getAssetsByCategory(AssetCategory.PROP)
  
  // 获取所有场景资产
  const scenes = getAssetsByCategory(AssetCategory.SCENE)
  
  // 获取所有主题资产
  const themes = getAssetsByCategory(AssetCategory.THEME)

  return {
    characters,
    props,
    scenes,
    themes,
    allAssets: assets,
  }
}

// ========== 示例 3: 在非组件函数中使用 ==========

/**
 * 示例：在 API 路由或其他非组件函数中使用
 */
export function processAssetsInAPI() {
  // 在非组件函数中，使用 getState() 获取 store 实例
  const store = useAssetStore.getState()
  
  // 获取所有角色
  const characters = store.getAssetsByCategory(AssetCategory.CHARACTER)
  
  // 处理角色数据
  characters.forEach((character) => {
    console.log(`角色: ${character.name}`)
    console.log(`描述: ${character.visualDescription}`)
    if (character.referenceImageUrl) {
      console.log(`参考图: ${character.referenceImageUrl}`)
    }
  })
}

// ========== 示例 4: 批量导入资产并去重 ==========

/**
 * 示例：从故事改编结果转换为统一 Asset 格式并同步
 */
export function syncAssetsFromStoryAdaptation(storyAssets: {
  characters: Array<{ name: string; description: string }>
  props: Array<{ name: string; visualDetails: string }>
  scenes: Array<{ name: string; description: string }>
  theme: string
}) {
  const syncAssets = useAssetStore.getState().syncAssets
  
  // 转换为统一 Asset 格式
  const assets: Asset[] = [
    // 转换角色
    ...storyAssets.characters.map((char) => ({
      id: `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: AssetCategory.CHARACTER,
      name: char.name,
      visualDescription: char.description,
      referenceImageUrl: null,
      createdAt: new Date(),
    })),
    
    // 转换道具
    ...storyAssets.props.map((prop) => ({
      id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: AssetCategory.PROP,
      name: prop.name,
      visualDescription: prop.visualDetails,
      referenceImageUrl: null,
      createdAt: new Date(),
    })),
    
    // 转换场景
    ...storyAssets.scenes.map((scene) => ({
      id: `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: AssetCategory.SCENE,
      name: scene.name,
      visualDescription: scene.description,
      referenceImageUrl: null,
      createdAt: new Date(),
    })),
    
    // 转换主题
    {
      id: `theme-${Date.now()}`,
      category: AssetCategory.THEME,
      name: storyAssets.theme,
      visualDescription: storyAssets.theme,
      referenceImageUrl: null,
      createdAt: new Date(),
    },
  ]

  // 同步资产（自动去重）
  syncAssets(assets)
}

// ========== 示例 5: 更新资产的参考图 URL ==========

/**
 * 示例：在生成参考图后更新资产的 referenceImageUrl
 */
export function updateAssetReferenceImage(assetId: string, imageUrl: string) {
  const store = useAssetStore.getState()
  const assets = store.assets
  
  // 找到资产并更新
  const updatedAssets = assets.map((asset) =>
    asset.id === assetId
      ? { ...asset, referenceImageUrl: imageUrl }
      : asset
  )
  
  // 同步更新后的资产
  store.syncAssets(updatedAssets)
}
