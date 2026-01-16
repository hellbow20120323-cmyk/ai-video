"""
视频生成器模块
基于 Stable Video Diffusion (SVD) 实现视频生成功能
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pathlib import Path
import torch
from PIL import Image
import numpy as np
import base64
import io
import time
import requests
import random
import json


class BaseVideoGenerator(ABC):
    """视频生成器基类"""
    
    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
        motion_score: float = 0.5,
        fps: int = 24
    ):
        """
        初始化视频生成器
        
        Args:
            config: 配置字典，包含模型路径、设备等配置
            motion_score: 动作幅度控制，范围 0.0-1.0，默认 0.5
            fps: 生成视频的帧率，默认 24
        """
        self.config = config or {}
        self.motion_score = max(0.0, min(1.0, motion_score))  # 限制在 0-1 范围
        self.fps = fps
        
        # 默认配置
        self.config.setdefault('model_path', None)
        self.config.setdefault('device', 'cuda' if torch.cuda.is_available() else 'cpu')
        self.config.setdefault('image_size', (1024, 576))  # 16:9 比例
        
    @abstractmethod
    def generate_clip(
        self,
        image_path: str,
        prompt: str,
        output_path: str
    ) -> str:
        """
        生成视频片段的核心函数
        
        Args:
            image_path: 输入图片路径
            prompt: 文本提示词
            output_path: 输出视频路径
            
        Returns:
            输出视频的路径
        """
        pass
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        预处理图片，确保符合模型比例要求
        
        Args:
            image: PIL Image 对象
            
        Returns:
            预处理后的 PIL Image 对象
        """
        target_width, target_height = self.config.get('image_size', (1024, 576))
        
        # 获取当前图片尺寸
        current_width, current_height = image.size
        
        # 计算目标宽高比
        target_ratio = target_width / target_height
        current_ratio = current_width / current_height
        
        # 调整图片尺寸以匹配目标比例
        if current_ratio > target_ratio:
            # 当前图片更宽，以高度为准
            new_height = target_height
            new_width = int(current_width * (target_height / current_height))
        else:
            # 当前图片更高，以宽度为准
            new_width = target_width
            new_height = int(current_height * (target_width / current_width))
        
        # 调整大小
        resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # 居中裁剪到目标尺寸
        left = (new_width - target_width) // 2
        top = (new_height - target_height) // 2
        right = left + target_width
        bottom = top + target_height
        
        cropped_image = resized_image.crop((left, top, right, bottom))
        
        return cropped_image
    
    def _load_image(self, image_path: str) -> Image.Image:
        """
        加载图片文件
        
        Args:
            image_path: 图片路径
            
        Returns:
            PIL Image 对象
        """
        image_path = Path(image_path)
        if not image_path.exists():
            raise FileNotFoundError(f"图片文件不存在: {image_path}")
        
        image = Image.open(image_path).convert('RGB')
        return image


class SVDGenerator(BaseVideoGenerator):
    """基于 Stable Video Diffusion 的视频生成器实现"""
    
    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
        motion_score: float = 0.5,
        fps: int = 24
    ):
        """
        初始化 SVD 生成器
        
        Args:
            config: 配置字典
            motion_score: 动作幅度控制，默认 0.5
            fps: 帧率，默认 24
        """
        super().__init__(config, motion_score, fps)
        
        # SVD 特定配置
        self.config.setdefault('model_path', 'stabilityai/stable-video-diffusion-img2vid')
        self.config.setdefault('num_frames', 25)  # 生成的帧数
        self.config.setdefault('num_inference_steps', 50)  # 推理步数
        self.config.setdefault('guidance_scale', 7.5)  # 引导强度
        
        # API 配置
        self.config.setdefault('api_provider', 'stability')  # 'stability' 或 'runway'
        self.config.setdefault('api_key', None)  # API 密钥
        self.config.setdefault('api_base_url', 'https://api.stability.ai')  # API 基础 URL
        self.config.setdefault('polling_interval', 3)  # 轮询间隔（秒）
        self.config.setdefault('max_polling_attempts', 200)  # 最大轮询次数（10分钟）
        
        # 动效模板配置
        self.config.setdefault('motion_config_path', None)  # 动效配置文件路径
        self._motion_templates: Dict[str, Dict[str, Any]] = {}
        self._load_motion_templates()
        
        # 模型相关属性（延迟加载）
        self._model = None
        self._pipe = None
        
    def _load_motion_templates(self):
        """加载动效模板配置"""
        config_path = self.config.get('motion_config_path')
        
        # 如果没有指定路径，使用默认路径
        if config_path is None:
            # 获取当前文件所在目录
            current_dir = Path(__file__).parent
            config_path = current_dir / 'motion_config.json'
        else:
            config_path = Path(config_path)
        
        # 加载配置文件
        if config_path.exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    self._motion_templates = json.load(f)
            except json.JSONDecodeError as e:
                raise ValueError(f"动效配置文件格式错误: {str(e)}")
            except Exception as e:
                raise RuntimeError(f"加载动效配置文件失败: {str(e)}")
        else:
            # 如果文件不存在，使用默认模板
            self._motion_templates = {
                "High Action": {
                    "motion_bucket_id": 127,
                    "noise_aug_strength": 0.1
                },
                "Cinematic Slow": {
                    "motion_bucket_id": 20,
                    "noise_aug_strength": 0.02
                }
            }
    
    def get_motion_template(self, template_name: str) -> Dict[str, Any]:
        """
        获取动效模板配置
        
        Args:
            template_name: 模板名称
            
        Returns:
            模板配置字典
        """
        if template_name not in self._motion_templates:
            available = ', '.join(self._motion_templates.keys())
            raise ValueError(
                f"动效模板 '{template_name}' 不存在。可用模板: {available}"
            )
        
        return self._motion_templates[template_name].copy()
    
    def list_motion_templates(self) -> Dict[str, Dict[str, Any]]:
        """
        列出所有可用的动效模板
        
        Returns:
            所有模板的字典
        """
        return self._motion_templates.copy()
    
    def _load_model(self):
        """延迟加载模型"""
        if self._pipe is not None:
            return
        
        try:
            from diffusers import StableVideoDiffusionPipeline
            from diffusers.utils import load_image, export_to_video
            import torch
            
            device = self.config['device']
            model_path = self.config['model_path']
            
            # 加载 SVD 模型
            self._pipe = StableVideoDiffusionPipeline.from_pretrained(
                model_path,
                torch_dtype=torch.float16 if device == 'cuda' else torch.float32,
                variant="fp16" if device == 'cuda' else None
            )
            self._pipe = self._pipe.to(device)
            self._pipe.enable_model_cpu_offload()
            
        except ImportError:
            raise ImportError(
                "请安装 diffusers 库: pip install diffusers accelerate transformers"
            )
        except Exception as e:
            raise RuntimeError(f"模型加载失败: {str(e)}")
    
    def _image_to_base64(self, image: Image.Image) -> str:
        """
        将 PIL Image 转换为 Base64 字符串
        
        Args:
            image: PIL Image 对象
            
        Returns:
            Base64 编码的字符串
        """
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        image_bytes = buffer.getvalue()
        base64_str = base64.b64encode(image_bytes).decode('utf-8')
        return base64_str
    
    def _image_to_bytes(self, image: Image.Image) -> bytes:
        """
        将 PIL Image 转换为 Bytes
        
        Args:
            image: PIL Image 对象
            
        Returns:
            图片的字节数据
        """
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        return buffer.getvalue()
    
    def _generate_with_stability_api(
        self,
        image_base64: str,
        motion_bucket_id: int,
        steps: int,
        seed: int,
        noise_aug_strength: float = 0.05
    ) -> str:
        """
        使用 Stability AI API 生成视频
        
        Args:
            image_base64: Base64 编码的图片
            motion_bucket_id: 运动强度
            steps: 推理步数
            seed: 随机种子
            
        Returns:
            任务 ID
        """
        api_key = self.config.get('api_key')
        if not api_key:
            raise ValueError("请设置 API Key: config['api_key']")
        
        api_url = f"{self.config['api_base_url']}/v2alpha/generation/image-to-video"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "image": image_base64,
            "motion_bucket_id": motion_bucket_id,
            "seed": seed,
            "cfg_scale": self.config.get('guidance_scale', 7.5),
            "steps": steps,
            "noise_aug_strength": noise_aug_strength
        }
        
        try:
            response = requests.post(api_url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            if 'id' not in result:
                raise RuntimeError(f"API 返回格式错误: {result}")
            
            return result['id']
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 402:
                raise RuntimeError("API 额度不足，请检查账户余额")
            elif e.response.status_code == 401:
                raise RuntimeError("API Key 无效或已过期")
            elif e.response.status_code == 429:
                raise RuntimeError("API 请求频率过高，请稍后重试")
            else:
                raise RuntimeError(f"API 请求失败: {e.response.status_code} - {e.response.text}")
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"网络请求失败: {str(e)}")
    
    def _poll_stability_task(self, task_id: str) -> Dict[str, Any]:
        """
        轮询 Stability AI 任务状态
        
        Args:
            task_id: 任务 ID
            
        Returns:
            任务状态信息
        """
        api_key = self.config.get('api_key')
        api_url = f"{self.config['api_base_url']}/v2alpha/generation/image-to-video/result/{task_id}"
        
        headers = {
            "Authorization": f"Bearer {api_key}"
        }
        
        try:
            response = requests.get(api_url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"查询任务状态失败: {str(e)}")
    
    def _download_video(self, video_url: str, output_path: Path) -> None:
        """
        下载视频文件
        
        Args:
            video_url: 视频下载 URL
            output_path: 输出路径
        """
        try:
            response = requests.get(video_url, timeout=300, stream=True)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"视频下载失败: {str(e)}")
    
    def _generate_with_runway_sdk(
        self,
        image_bytes: bytes,
        motion_bucket_id: int,
        steps: int,
        seed: int,
        noise_aug_strength: float = 0.05
    ) -> str:
        """
        使用 Runway SDK 生成视频
        
        Args:
            image_bytes: 图片字节数据
            motion_bucket_id: 运动强度
            steps: 推理步数
            seed: 随机种子
            
        Returns:
            任务 ID
        """
        try:
            from runway import Runway
        except ImportError:
            raise ImportError("请安装 runway SDK: pip install runway")
        
        api_key = self.config.get('api_key')
        if not api_key:
            raise ValueError("请设置 API Key: config['api_key']")
        
        runway = Runway(api_key=api_key)
        
        try:
            # 上传图片
            image_response = runway.files.upload(image_bytes)
            image_id = image_response['id']
            
            # 创建生成任务
            task = runway.generate.create(
                model="svd",
                image_id=image_id,
                motion_bucket_id=motion_bucket_id,
                steps=steps,
                seed=seed,
                noise_aug_strength=noise_aug_strength
            )
            
            return task['id']
            
        except Exception as e:
            raise RuntimeError(f"Runway API 调用失败: {str(e)}")
    
    def _poll_runway_task(self, task_id: str) -> Dict[str, Any]:
        """
        轮询 Runway 任务状态
        
        Args:
            task_id: 任务 ID
            
        Returns:
            任务状态信息
        """
        try:
            from runway import Runway
        except ImportError:
            raise ImportError("请安装 runway SDK: pip install runway")
        
        api_key = self.config.get('api_key')
        runway = Runway(api_key=api_key)
        
        try:
            task = runway.tasks.get(task_id)
            return task
        except Exception as e:
            raise RuntimeError(f"查询任务状态失败: {str(e)}")
    
    def generate_clip(
        self,
        image_path: str,
        prompt: str,
        output_path: str,
        seed: Optional[int] = None,
        template_name: Optional[str] = None
    ) -> str:
        """
        生成视频片段（使用 API）
        
        Args:
            image_path: 输入图片路径
            prompt: 文本提示词（SVD 主要基于图片，prompt 作为辅助）
            output_path: 输出视频路径
            seed: 随机种子，如果为 None 则随机生成
            template_name: 动效模板名称（如 'High Action', 'Cinematic Slow'），
                          如果提供则使用模板参数，否则使用 motion_score
            
        Returns:
            输出视频的路径
        """
        # 确保输出目录存在
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 加载并预处理图片
        image = self._load_image(image_path)
        processed_image = self._preprocess_image(image)
        
        # 根据模板名称或 motion_score 确定参数
        if template_name:
            # 使用动效模板
            template = self.get_motion_template(template_name)
            motion_bucket_id = template['motion_bucket_id']
            noise_aug_strength = template.get('noise_aug_strength', 0.05)
        else:
            # 使用 motion_score 映射到 motion_bucket_id
            # motion_bucket_id 范围通常是 1-255
            motion_bucket_id = int(1 + 254 * self.motion_score)  # 映射到 1-255 范围
            noise_aug_strength = 0.05  # 默认值
        
        # 获取推理步数
        steps = self.config.get('num_inference_steps', 50)
        
        # 生成随机种子（如果未提供）
        if seed is None:
            seed = random.randint(0, 2**32 - 1)
        
        # 根据配置选择 API 提供商
        api_provider = self.config.get('api_provider', 'stability')
        
        try:
            # 1. 读取图片并转换为 Base64 或 Bytes
            if api_provider == 'stability':
                image_base64 = self._image_to_base64(processed_image)
                # 2. 调用生成接口
                task_id = self._generate_with_stability_api(
                    image_base64=image_base64,
                    motion_bucket_id=motion_bucket_id,
                    steps=steps,
                    seed=seed,
                    noise_aug_strength=noise_aug_strength
                )
            elif api_provider == 'runway':
                image_bytes = self._image_to_bytes(processed_image)
                # 2. 调用生成接口
                task_id = self._generate_with_runway_sdk(
                    image_bytes=image_bytes,
                    motion_bucket_id=motion_bucket_id,
                    steps=steps,
                    seed=seed,
                    noise_aug_strength=noise_aug_strength
                )
            else:
                raise ValueError(f"不支持的 API 提供商: {api_provider}")
            
            # 3. 轮询机制：每隔3秒检查一次任务状态
            polling_interval = self.config.get('polling_interval', 3)
            max_attempts = self.config.get('max_polling_attempts', 200)
            
            for attempt in range(max_attempts):
                time.sleep(polling_interval)
                
                # 查询任务状态
                if api_provider == 'stability':
                    status = self._poll_stability_task(task_id)
                    task_status = status.get('status', 'unknown')
                    
                    if task_status == 'complete':
                        # 任务完成，下载视频
                        video_url = status.get('video_url')
                        if not video_url:
                            raise RuntimeError("任务完成但未返回视频 URL")
                        self._download_video(video_url, output_path)
                        return str(output_path)
                    elif task_status == 'failed':
                        error_msg = status.get('error', '未知错误')
                        raise RuntimeError(f"视频生成失败: {error_msg}")
                    # 其他状态（processing, pending）继续轮询
                    
                elif api_provider == 'runway':
                    status = self._poll_runway_task(task_id)
                    task_status = status.get('status', 'unknown')
                    
                    if task_status == 'succeeded':
                        # 任务完成，下载视频
                        video_url = status.get('output', {}).get('video_url')
                        if not video_url:
                            raise RuntimeError("任务完成但未返回视频 URL")
                        self._download_video(video_url, output_path)
                        return str(output_path)
                    elif task_status == 'failed':
                        error_msg = status.get('error', '未知错误')
                        raise RuntimeError(f"视频生成失败: {error_msg}")
                    # 其他状态继续轮询
                
                # 显示进度（可选）
                if attempt % 10 == 0:  # 每30秒显示一次
                    print(f"任务进行中... (已等待 {attempt * polling_interval} 秒)")
            
            # 超时
            raise RuntimeError(f"任务超时：已等待 {max_attempts * polling_interval} 秒")
            
        except ValueError as e:
            raise ValueError(f"参数错误: {str(e)}")
        except RuntimeError as e:
            raise RuntimeError(f"视频生成失败: {str(e)}")
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"网络请求失败: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"未知错误: {str(e)}")
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        预处理图片，确保符合 SVD 模型要求（1024x576）
        
        Args:
            image: PIL Image 对象
            
        Returns:
            预处理后的 PIL Image 对象
        """
        # SVD 模型要求 1024x576 (16:9)
        return super()._preprocess_image(image)
    
    def set_motion_score(self, motion_score: float):
        """
        设置动作幅度
        
        Args:
            motion_score: 动作幅度，范围 0.0-1.0
        """
        self.motion_score = max(0.0, min(1.0, motion_score))
    
    def set_fps(self, fps: int):
        """
        设置帧率
        
        Args:
            fps: 帧率
        """
        self.fps = max(1, fps)
    
    def get_config(self) -> Dict[str, Any]:
        """
        获取当前配置
        
        Returns:
            配置字典
        """
        return {
            'config': self.config.copy(),
            'motion_score': self.motion_score,
            'fps': self.fps
        }
