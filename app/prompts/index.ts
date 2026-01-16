/**
 * AI 提示词模板
 * 将提示词与业务逻辑解耦，便于维护和迭代
 */

/**
 * 故事改编提示词
 * @param content - 原始故事内容
 * @returns 格式化后的提示词
 */
export const ADAPTATION_PROMPT = (content: string) => `
你是一位好莱坞资深编剧和故事架构师。
请将以下原始素材改编为一个极具张力的故事大纲，并提取关键资产信息。

原始素材：${content}

要求：
1. 风格设定：强化视觉对比，节奏紧凑。
2. 角色：定义 1-3 个核心角色及其动机，详细描述每个角色的外貌、服装和特征。
3. 结构：按照"三幕式结构"（起、承、转、合）进行扩充，确保故事完整且有张力。
4. 资产提取：
   - 识别关键道具，详细描述其材质、大小、颜色、形状和特殊效果
   - 识别核心场景，详细描述环境、灯光、氛围和关键元素
   - 确定视觉风格和色彩调色板

请严格按照以下 JSON 格式返回，不要包含任何 Markdown 代码块标记：

{
  "story_outline": "完整的故事大纲（三幕式结构）",
  "assets": {
    "characters": [
      {
        "name": "角色名称",
        "description": "详细的外貌、服装、特征描述"
      }
    ],
    "props": [
      {
        "name": "道具名称",
        "description": "详细的材质、大小、颜色、形状、特殊效果描述"
      }
    ],
    "scenes": [
      {
        "name": "场景名称",
        "description": "详细的环境、灯光、氛围描述"
      }
    ],
    "theme": {
      "visual_style": "视觉风格（如：赛博朋克、极简主义、水墨风、3D粘土等）",
      "color_palette": "色彩调色板（如：高对比度霓虹色、柔和暖色调、冷色调等）"
    }
  }
}
`;

/**
 * 剧本生成提示词
 * @param story - 故事大纲
 * @returns 格式化后的提示词
 */
export const SCRIPT_GENERATION_PROMPT = (story: string) => `
你是一位专业的电影导演和分镜设计师。
请将以下故事大纲拆解为详细的、可供拍摄的剧本 JSON 数据。

故事大纲：${story}

要求：
1. 严格输出 JSON 格式，不要包含 Markdown 代码块（如 \`\`\`json）。
2. JSON 结构必须是一个对象数组，每个对象包含：
   - "sceneNumber": 数字
   - "visual_description": 极其详细的画面描述（包含环境、灯光、主体动作），用于生图提示词。
   - "dialogue": 旁白或对白（如果没有则为空字符串）。
   - "motion_guidance": 镜头运动建议（如：Slow zoom in, Handheld shake）。

输出格式示例：
[
  { "sceneNumber": 1, "visual_description": "...", "dialogue": "...", "motion_guidance": "..." }
]
`;
