/**
 * 资产管理 Store
 * 使用 Zustand 进行状态管理
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Character, Prop, Scene, Theme, StoryAssets, Asset, AssetCategory } from '@/types/assets'

interface AssetStore {
  // 状态
  characters: Character[]
  props: Prop[]
  scenes: Scene[]
  theme: Theme | null
  /** 统一的资产列表（新增） */
  assets: Asset[]

  // Actions
  addCharacter: (character: Omit<Character, 'id' | 'createdAt'>) => void
  addProp: (prop: Omit<Prop, 'id' | 'createdAt'>) => void
  addScene: (scene: Omit<Scene, 'id' | 'createdAt'>) => void
  setTheme: (theme: Theme) => void
  
  // 批量添加资产
  addAssetsFromStory: (assets: StoryAssets) => void
  
  // 更新资产
  updateCharacter: (id: string, updates: Partial<Character>) => void
  updateProp: (id: string, updates: Partial<Prop>) => void
  updateScene: (id: string, updates: Partial<Scene>) => void
  
  // 删除资产
  removeCharacter: (id: string) => void
  removeProp: (id: string) => void
  removeScene: (id: string) => void
  
  // 清空所有资产
  clearAll: () => void

  // 统一的资产管理方法（新增）
  /** 同步资产数组，自动去重并保存到 localStorage */
  syncAssets: (newAssets: Asset[]) => void
  /** 根据类别获取资产 */
  getAssetsByCategory: (category: AssetCategory) => Asset[]
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 检查角色是否已存在（基于名称）
 */
function characterExists(characters: Character[], name: string): boolean {
  return characters.some(char => char.name.toLowerCase().trim() === name.toLowerCase().trim())
}

/**
 * 检查道具是否已存在（基于名称）
 */
function propExists(props: Prop[], name: string): boolean {
  return props.some(prop => prop.name.toLowerCase().trim() === name.toLowerCase().trim())
}

/**
 * 检查场景是否已存在（基于名称）
 */
function sceneExists(scenes: Scene[], name: string): boolean {
  return scenes.some(scene => scene.name.toLowerCase().trim() === name.toLowerCase().trim())
}

/**
 * 检查资产是否已存在（基于 ID 或名称+类别）
 */
function assetExists(assets: Asset[], asset: Asset): boolean {
  return assets.some(
    (a) =>
      a.id === asset.id ||
      (a.name.toLowerCase().trim() === asset.name.toLowerCase().trim() &&
        a.category === asset.category)
  )
}

export const useAssetStore = create<AssetStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      characters: [],
      props: [],
      scenes: [],
      theme: null,
      assets: [],

      // 添加单个角色
      addCharacter: (character) => {
        const { characters } = get()
        // 去重：检查是否已存在同名角色
        if (characterExists(characters, character.name)) {
          return // 如果已存在，不添加
        }
        
        set({
          characters: [
            ...characters,
            {
              ...character,
              id: generateId(),
              createdAt: new Date(),
            },
          ],
        })
      },

      // 添加单个道具
      addProp: (prop) => {
        const { props } = get()
        // 去重：检查是否已存在同名道具
        if (propExists(props, prop.name)) {
          return // 如果已存在，不添加
        }
        
        set({
          props: [
            ...props,
            {
              ...prop,
              id: generateId(),
              createdAt: new Date(),
            },
          ],
        })
      },

      // 添加单个场景
      addScene: (scene) => {
        const { scenes } = get()
        // 去重：检查是否已存在同名场景
        if (sceneExists(scenes, scene.name)) {
          return // 如果已存在，不添加
        }
        
        set({
          scenes: [
            ...scenes,
            {
              ...scene,
              id: generateId(),
              createdAt: new Date(),
            },
          ],
        })
      },

      // 设置视觉基调
      setTheme: (theme) => {
        set({ theme })
      },

      // 从故事改编结果批量添加资产
      addAssetsFromStory: (assets) => {
        const { characters, props, scenes } = get()
        
        // 添加角色（去重）
        const newCharacters: Character[] = []
        assets.characters.forEach((char) => {
          if (!characterExists(characters, char.name)) {
            newCharacters.push({
              id: generateId(),
              name: char.name,
              description: char.description,
              createdAt: new Date(),
            })
          }
        })

        // 添加道具（去重）
        const newProps: Prop[] = []
        assets.props.forEach((prop) => {
          if (!propExists(props, prop.name)) {
            newProps.push({
              id: generateId(),
              name: prop.name,
              // 兼容新格式（description）和旧格式（visualDetails）
              visualDetails: prop.description || (prop as any).visualDetails || '',
              createdAt: new Date(),
            })
          }
        })

        // 添加场景（去重）
        const newScenes: Scene[] = []
        assets.scenes.forEach((scene) => {
          if (!sceneExists(scenes, scene.name)) {
            newScenes.push({
              id: generateId(),
              name: scene.name,
              description: scene.description,
              createdAt: new Date(),
            })
          }
        })

        // 处理 theme：支持新格式（对象）和旧格式（字符串）的兼容
        let themeValue: Theme | null = null
        if (typeof assets.theme === 'object' && assets.theme !== null) {
          // 新格式：对象，使用 visual_style 作为主题值
          themeValue = assets.theme.visual_style || null
        } else if (typeof assets.theme === 'string') {
          // 旧格式：字符串（向后兼容）
          themeValue = assets.theme
        }

        // 更新状态
        set({
          characters: [...characters, ...newCharacters],
          props: [...props, ...newProps],
          scenes: [...scenes, ...newScenes],
          theme: themeValue,
        })
      },

      // 更新角色
      updateCharacter: (id, updates) => {
        set({
          characters: get().characters.map((char) =>
            char.id === id ? { ...char, ...updates } : char
          ),
        })
      },

      // 更新道具
      updateProp: (id, updates) => {
        set({
          props: get().props.map((prop) =>
            prop.id === id ? { ...prop, ...updates } : prop
          ),
        })
      },

      // 更新场景
      updateScene: (id, updates) => {
        set({
          scenes: get().scenes.map((scene) =>
            scene.id === id ? { ...scene, ...updates } : scene
          ),
        })
      },

      // 删除角色
      removeCharacter: (id) => {
        set({
          characters: get().characters.filter((char) => char.id !== id),
        })
      },

      // 删除道具
      removeProp: (id) => {
        set({
          props: get().props.filter((prop) => prop.id !== id),
        })
      },

      // 删除场景
      removeScene: (id) => {
        set({
          scenes: get().scenes.filter((scene) => scene.id !== id),
        })
      },

      // 清空所有资产
      clearAll: () => {
        set({
          characters: [],
          props: [],
          scenes: [],
          theme: null,
          assets: [],
        })
      },

      // 同步资产数组，自动去重并保存
      syncAssets: (newAssets) => {
        const { assets: existingAssets } = get()
        const mergedAssets: Asset[] = [...existingAssets]

        // 遍历新资产，去重并合并
        newAssets.forEach((newAsset) => {
          // 检查是否已存在（基于 ID 或 名称+类别）
          const exists = assetExists(mergedAssets, newAsset)

          if (!exists) {
            // 如果不存在，添加新资产
            mergedAssets.push({
              ...newAsset,
              // 确保有 ID
              id: newAsset.id || generateId(),
              // 确保有创建时间
              createdAt: newAsset.createdAt || new Date(),
            })
          } else {
            // 如果已存在，更新现有资产（保留原有 ID 和创建时间）
            const existingIndex = mergedAssets.findIndex(
              (a) =>
                a.id === newAsset.id ||
                (a.name.toLowerCase().trim() === newAsset.name.toLowerCase().trim() &&
                  a.category === newAsset.category)
            )
            if (existingIndex !== -1) {
              // 更新资产信息，但保留原有的 ID 和 createdAt
              mergedAssets[existingIndex] = {
                ...mergedAssets[existingIndex],
                ...newAsset,
                id: mergedAssets[existingIndex].id, // 保留原有 ID
                createdAt: mergedAssets[existingIndex].createdAt, // 保留原有创建时间
              }
            }
          }
        })

        // 更新状态（会自动持久化到 localStorage）
        set({ assets: mergedAssets })
      },

      // 根据类别获取资产
      getAssetsByCategory: (category) => {
        const { assets } = get()
        return assets.filter((asset) => asset.category === category)
      },
    }),
    {
      name: 'ai-video-platform-assets', // localStorage 键名
      // 使用 createJSONStorage 处理 Date 对象的序列化
      storage: createJSONStorage(() => localStorage, {
        // 序列化：将 Date 对象转换为特殊格式
        replacer: (key, value) => {
          if (value instanceof Date) {
            return { type: 'date', value: value.toISOString() }
          }
          return value
        },
        // 反序列化：将特殊格式转换回 Date 对象
        reviver: (key, value) => {
          if (
            value &&
            typeof value === 'object' &&
            'type' in value &&
            value.type === 'date' &&
            'value' in value &&
            typeof value.value === 'string'
          ) {
            return new Date(value.value)
          }
          return value
        },
      }),
    }
  )
)
