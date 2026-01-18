/**
 * 剧本数据结构定义
 */

/**
 * 场景数据结构
 */
export interface Scene {
  /** 场景编号 */
  sceneNumber: number
  /** 视觉画面描述（用于后续生成分镜） */
  content: string
  /** 旁白或对白 */
  dialogue: string
  /** 特效或运镜建议（如"推镜头"、"低头视角"） */
  vfx_suggestion: string
  /** 预计时长（秒） */
  duration: number
  /** 生成的分镜图片 URL（可选） */
  imageUrl?: string | null
  /** 该场景中出现的角色名称数组（可选，由 Gemini 自动识别） */
  characters?: string[]
}

/**
 * 剧本数据结构
 */
export interface Script {
  /** 剧本唯一标识 */
  id: string
  /** 剧本标题 */
  title: string
  /** 作者 */
  author: string
  /** 创建时间 */
  createdAt: string | Date
  /** 场景数组 */
  scenes: Scene[]
  /** 所属项目 ID */
  projectId: string | null
}

/**
 * 创建新剧本的输入数据
 */
export interface CreateScriptInput {
  title: string
  author: string
  scenes?: Omit<Scene, 'sceneNumber'>[]  // 场景编号会自动生成
}

/**
 * 更新剧本的输入数据
 */
export interface UpdateScriptInput {
  title?: string
  author?: string
  scenes?: Scene[]
}
