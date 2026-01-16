/**
 * 剧本数据结构使用示例
 */

import { Script, Scene, CreateScriptInput } from './script'

// 示例：创建一个完整的剧本对象
const exampleScript: Script = {
  id: 'script-001',
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
    },
    {
      sceneNumber: 3,
      content: '虚拟空间中，赛博剑客与神秘黑客展开对决',
      dialogue: '这场战斗将决定数字世界的未来。',
      vfx_suggestion: '环绕镜头，360度旋转展示战斗场面',
      duration: 8.0
    }
  ]
}

// 示例：创建新剧本的输入
const createScriptInput: CreateScriptInput = {
  title: '新的剧本',
  author: '作者名',
  scenes: [
    {
      content: '场景描述',
      dialogue: '对白内容',
      vfx_suggestion: '运镜建议',
      duration: 3.0
    }
  ]
}

export { exampleScript, createScriptInput }
