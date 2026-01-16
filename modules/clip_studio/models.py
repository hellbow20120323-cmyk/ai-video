"""
剧本数据模型（Python 版本）
用于后端 API 或数据处理
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class Scene(BaseModel):
    """场景数据模型"""
    
    scene_number: int = Field(..., description="场景编号")
    content: str = Field(..., description="视觉画面描述（用于后续生成分镜）")
    dialogue: str = Field(..., description="旁白或对白")
    vfx_suggestion: str = Field(..., description="特效或运镜建议（如'推镜头'、'低头视角'）")
    duration: float = Field(..., ge=0, description="预计时长（秒）")
    
    class Config:
        json_schema_extra = {
            "example": {
                "scene_number": 1,
                "content": "赛博剑客站在霓虹街头，雨水从空中落下",
                "dialogue": "在这个数字化的世界里，每个人都在寻找自己的真相。",
                "vfx_suggestion": "推镜头，从远景逐渐推进到角色特写",
                "duration": 5.0
            }
        }


class Script(BaseModel):
    """剧本数据模型"""
    
    id: str = Field(..., description="剧本唯一标识")
    title: str = Field(..., description="剧本标题")
    author: str = Field(..., description="作者")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    scenes: List[Scene] = Field(default_factory=list, description="场景数组")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "script-001",
                "title": "赛博剑客的觉醒",
                "author": "AI Writer",
                "created_at": "2024-01-15T10:00:00Z",
                "scenes": [
                    {
                        "scene_number": 1,
                        "content": "赛博剑客站在霓虹街头",
                        "dialogue": "在这个数字化的世界里...",
                        "vfx_suggestion": "推镜头",
                        "duration": 5.0
                    }
                ]
            }
        }


class CreateScriptInput(BaseModel):
    """创建新剧本的输入数据"""
    
    title: str = Field(..., description="剧本标题")
    author: str = Field(..., description="作者")
    scenes: Optional[List[dict]] = Field(default_factory=list, description="场景数据（scene_number会自动生成）")


class UpdateScriptInput(BaseModel):
    """更新剧本的输入数据"""
    
    title: Optional[str] = Field(None, description="剧本标题")
    author: Optional[str] = Field(None, description="作者")
    scenes: Optional[List[Scene]] = Field(None, description="场景数组")
