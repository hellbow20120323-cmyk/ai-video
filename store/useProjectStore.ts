/**
 * 项目管理 Store
 * 使用 Zustand 进行状态管理
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * 项目数据结构
 */
export interface Project {
  /** 项目唯一标识 */
  id: string
  /** 项目名称 */
  name: string
  /** 艺术风格 */
  artStyle: string
  /** 文化背景 */
  culturalBackground: string
  /** 创建时间 */
  createdAt: string | Date
  /** 最后修改时间 */
  updatedAt?: string | Date
}

interface ProjectStore {
  // 状态
  /** 项目列表 */
  projects: Project[]
  /** 当前选中的项目 ID */
  currentProjectId: string | null

  // Actions
  /** 添加项目 */
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => string
  /** 更新项目 */
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void
  /** 删除项目 */
  removeProject: (id: string) => void
  /** 设置当前项目 */
  setCurrentProject: (id: string | null) => void
  /** 获取当前项目 */
  getCurrentProject: () => Project | null
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      projects: [],
      currentProjectId: null,

      // 添加项目
      addProject: (project) => {
        const now = new Date()
        const newProject: Project = {
          ...project,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          projects: [...state.projects, newProject],
        }))
        return newProject.id
      },

      // 更新项目
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, ...updates, updatedAt: new Date() } : project
          ),
        }))
      },

      // 删除项目
      removeProject: (id) => {
        set((state) => {
          const newProjects = state.projects.filter((project) => project.id !== id)
          // 如果删除的是当前项目，清空当前项目 ID
          const newCurrentProjectId =
            state.currentProjectId === id
              ? newProjects.length > 0
                ? newProjects[0].id
                : null
              : state.currentProjectId
          return {
            projects: newProjects,
            currentProjectId: newCurrentProjectId,
          }
        })
      },

      // 设置当前项目
      setCurrentProject: (id) => {
        set({ currentProjectId: id })
      },

      // 获取当前项目
      getCurrentProject: () => {
        const { projects, currentProjectId } = get()
        if (!currentProjectId) return null
        return projects.find((project) => project.id === currentProjectId) || null
      },
    }),
    {
      name: 'ai-video-platform-projects', // LocalStorage 键名
      storage: createJSONStorage(() => localStorage),
    }
  )
)
