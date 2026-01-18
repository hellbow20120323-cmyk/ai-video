/**
 * 资产数据结构定义
 */

/**
 * 资产类别枚举
 */
export enum AssetCategory {
  /** 角色 */
  CHARACTER = 'character',
  /** 场景 */
  SCENE = 'scene',
  /** 道具 */
  PROP = 'prop',
  /** 主题/视觉基调 */
  THEME = 'theme',
}

/**
 * 统一的资产数据结构
 */
export interface Asset {
  /** 资产唯一标识 */
  id: string
  /** 资产类别 */
  category: AssetCategory
  /** 资产名称 */
  name: string
  /** 详细视觉描述 */
  visualDescription: string
  /** 参考图 URL（可选） */
  referenceImageUrl?: string | null
  /** 创建时间 */
  createdAt: string | Date
  /** 所属项目 ID */
  projectId: string | null
}

/**
 * 角色数据结构
 */
export interface Character {
  /** 角色唯一标识 */
  id: string
  /** 角色名称 */
  name: string
  /** 角色外貌特征描述 */
  description: string
  /** 语音音色 ID（OpenAI TTS 音色：alloy, echo, fable, onyx, nova, shimmer） */
  voiceId?: string | null
  /** 创建时间 */
  createdAt: string | Date
  /** 所属项目 ID */
  projectId: string | null
}

/**
 * 道具数据结构
 */
export interface Prop {
  /** 道具唯一标识 */
  id: string
  /** 道具名称 */
  name: string
  /** 道具的视觉细节描述 */
  visualDetails: string
  /** 创建时间 */
  createdAt: string | Date
  /** 所属项目 ID */
  projectId: string | null
}

/**
 * 场景数据结构
 */
export interface Scene {
  /** 场景唯一标识 */
  id: string
  /** 场景名称 */
  name: string
  /** 场景的详细描述 */
  description: string
  /** 创建时间 */
  createdAt: string | Date
  /** 所属项目 ID */
  projectId: string | null
}

/**
 * 视觉基调类型
 */
export type Theme = string

/**
 * 资产集合
 */
export interface AssetCollection {
  characters: Character[]
  props: Prop[]
  scenes: Scene[]
  theme: Theme | null
}

/**
 * 从故事改编结果中提取的资产数据
 */
export interface StoryAssets {
  characters: Array<{ name: string; description: string }>
  props: Array<{ name: string; description: string }>
  scenes: Array<{ name: string; description: string }>
  theme: {
    visual_style: string
    color_palette: string
  } | string // 支持新格式（对象）和旧格式（字符串）的兼容
}
