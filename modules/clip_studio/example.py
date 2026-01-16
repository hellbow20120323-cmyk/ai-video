"""
视频生成器使用示例
"""

from video_generator import SVDGenerator

# 示例1：使用动效模板
def example_with_template():
    # 初始化生成器
    config = {
        'api_provider': 'stability',  # 或 'runway'
        'api_key': 'your-api-key-here',
        'api_base_url': 'https://api.stability.ai',
        'motion_config_path': None  # 使用默认路径，或指定自定义路径
    }
    
    generator = SVDGenerator(
        config=config,
        motion_score=0.5,  # 如果不使用模板，则使用此值
        fps=24
    )
    
    # 查看所有可用的动效模板
    templates = generator.list_motion_templates()
    print("可用的动效模板:")
    for name, template in templates.items():
        print(f"  - {name}: {template.get('description', '')}")
    
    # 使用动效模板生成视频
    try:
        output_path = generator.generate_clip(
            image_path='path/to/input/image.jpg',
            prompt='A cyberpunk scene with neon lights',
            output_path='output/video.mp4',
            template_name='High Action'  # 使用高动作模板
        )
        print(f"视频生成成功: {output_path}")
    except Exception as e:
        print(f"生成失败: {e}")

# 示例2：不使用模板，使用 motion_score
def example_without_template():
    config = {
        'api_provider': 'stability',
        'api_key': 'your-api-key-here'
    }
    
    generator = SVDGenerator(
        config=config,
        motion_score=0.7,  # 使用自定义动作幅度
        fps=24
    )
    
    try:
        output_path = generator.generate_clip(
            image_path='path/to/input/image.jpg',
            prompt='A cinematic slow scene',
            output_path='output/video.mp4'
            # 不提供 template_name，将使用 motion_score
        )
        print(f"视频生成成功: {output_path}")
    except Exception as e:
        print(f"生成失败: {e}")

# 示例3：获取特定模板的配置
def example_get_template():
    generator = SVDGenerator()
    
    # 获取特定模板的配置
    template = generator.get_motion_template('Cinematic Slow')
    print(f"Cinematic Slow 模板配置: {template}")
    # 输出: {'motion_bucket_id': 20, 'noise_aug_strength': 0.02, 'description': '...'}

if __name__ == '__main__':
    print("=== 示例1: 使用动效模板 ===")
    example_with_template()
    
    print("\n=== 示例2: 不使用模板 ===")
    example_without_template()
    
    print("\n=== 示例3: 获取模板配置 ===")
    example_get_template()
