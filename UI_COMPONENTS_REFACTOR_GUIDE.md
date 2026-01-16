# UI 组件重构指南

## 已创建的组件

### 1. Card 组件 (`app/components/Card.tsx`)
- **背景**: 纯白 `#FFFFFF`
- **边框**: 极浅灰色 `#E5E5E5` (1px)
- **毛玻璃效果**: 支持 `variant="glass"` 模式（`backdrop-blur-md bg-white/70`）
- **圆角**: 使用 `rounded-apple-xl` (24px)
- **阴影**: 使用 `shadow-apple-md` 软阴影

**使用示例**:
```tsx
<Card padding="md">
  <h2>标题</h2>
  <p>内容</p>
</Card>

<Card variant="glass" padding="lg">
  毛玻璃效果卡片
</Card>
```

### 2. Button 组件 (`app/components/Button.tsx`)
- **主按钮**: 深黑色背景 `#000000`，纯白文字
- **次级按钮**: 浅灰色背景 `#F5F5F7`
- **Ghost 按钮**: 透明背景，hover 时显示背景
- **移除渐变**: 所有按钮使用纯色背景
- **缩放动画**: `active:scale-95` 平滑缩放
- **支持图标**: 可配置图标位置（左侧/右侧）

**使用示例**:
```tsx
<Button variant="primary" size="lg" icon={Plus}>
  创建新项目
</Button>

<Button variant="secondary" size="md" icon={Edit3} iconPosition="right">
  编辑
</Button>

<Button variant="ghost" size="sm">
  取消
</Button>
```

### 3. Input 组件 (`app/components/Input.tsx`)
- **背景**: 浅灰色 `#F5F5F7`
- **边框**: `#E5E5E5`
- **聚焦光晕**: 淡蓝色环绕光晕 `focus:ring-4 focus:ring-[#007AFF]/10`
- **支持标签和错误提示**

**使用示例**:
```tsx
<Input
  type="text"
  label="视觉基调"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="输入内容..."
  helperText="这是辅助文字"
/>
```

### 4. Textarea 组件 (`app/components/Textarea.tsx`)
- **背景**: 浅灰色 `#F5F5F7`
- **边框**: `#E5E5E5`
- **聚焦光晕**: 淡蓝色环绕光晕 `focus:ring-4 focus:ring-[#007AFF]/10`
- **自动禁用 resize**

**使用示例**:
```tsx
<Textarea
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="输入多行文本..."
  rows={5}
/>
```

## 样式替换对照表

### Card 替换
```tsx
// 旧代码
<div className="bg-white rounded-2xl border border-gray-300/50 p-6 shadow-lg">
  {children}
</div>

// 新代码
<Card padding="lg">
  {children}
</Card>
```

### Button 替换
```tsx
// 旧代码 - 主按钮
<button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-xl">
  按钮
</button>

// 新代码
<Button variant="primary" size="md">
  按钮
</Button>

// 旧代码 - 次级按钮
<button className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg">
  按钮
</button>

// 新代码
<Button variant="secondary" size="sm">
  按钮
</Button>
```

### Input/Textarea 替换
```tsx
// 旧代码
<input
  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:border-cyan-500"
/>

// 新代码
<Input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// 旧代码 - Textarea
<textarea
  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:border-cyan-500"
/>

// 新代码
<Textarea
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

## 已更新的页面区域

1. ✅ **故事改编页面**: 左侧输入区和右侧预览区已使用 Card 和 Button 组件
2. ✅ **资产中心 - 角色管理**: 已使用 Card、Input、Textarea、Button 组件
3. ✅ **全局设置**: 已使用 Card 和 Input 组件
4. ✅ **创建项目按钮**: 已使用 Button 组件

## 待更新的区域

以下区域仍需要手动替换为新的组件：

1. **资产中心 - 道具管理**: 需要替换为 Card、Input、Textarea、Button
2. **资产中心 - 场景管理**: 需要替换为 Card、Input、Textarea、Button
3. **分镜管理页面**: 需要替换所有卡片和按钮
4. **剧本管理页面**: 需要替换输入框和按钮
5. **视频生成页面**: 需要替换所有 UI 元素
6. **项目概览页面**: 需要替换卡片和按钮

## 颜色和样式规范

### 背景色
- 主背景: `bg-[#FFFFFF]` 或 `bg-apple-white`
- 次背景: `bg-[#F5F5F7]` 或 `bg-apple-gray-light`

### 文字颜色
- 主文字: `text-[#1D1D1F]` 或 `text-apple-text-primary`
- 次文字: `text-[#86868B]` 或 `text-apple-text-secondary`

### 边框颜色
- 标准边框: `border-[#E5E5E5]`

### 圆角
- 小圆角: `rounded-apple-md` (16px)
- 中圆角: `rounded-apple-lg` (20px)
- 大圆角: `rounded-apple-xl` (24px)

### 阴影
- 小阴影: `shadow-apple`
- 中阴影: `shadow-apple-md`
- 大阴影: `shadow-apple-lg`

## 注意事项

1. 所有按钮都应使用 `Button` 组件，移除渐变背景
2. 所有卡片都应使用 `Card` 组件，确保边框和阴影一致
3. 所有输入框都应使用 `Input` 或 `Textarea` 组件，确保聚焦效果一致
4. 主按钮使用深黑色 `#000000`，不要使用彩色背景
5. 所有交互都应使用 `active:scale-95` 缩放动画
