# Apple 设计规范样式指南

本文档说明如何在项目中使用 Apple 设计规范的样式系统。

## 调色盘

### 背景色
- **纯白**: `bg-[#FFFFFF]` 或 `bg-apple-white`
- **极浅灰**: `bg-[#F5F5F7]` 或 `bg-apple-gray-light`

### 文字颜色
- **深炭黑（主文字）**: `text-[#1D1D1F]` 或 `text-apple-text-primary`
- **次级灰（辅助文字）**: `text-[#86868B]` 或 `text-apple-text-secondary`

### 边框颜色
- **浅灰边框**: `border-[#E5E5E7]`

## 字体

系统已配置为使用 Apple San Francisco 字体栈，字间距已自动缩小（-0.01em）。

## 圆角

使用大圆角，推荐：
- `rounded-apple-md` (16px)
- `rounded-apple-lg` (20px)
- `rounded-apple-xl` (24px)
- `rounded-apple-2xl` (28px)
- `rounded-apple-3xl` (32px)

## 阴影

使用软阴影工具类：
- `shadow-apple` - 小阴影
- `shadow-apple-md` - 中等阴影
- `shadow-apple-lg` - 大阴影
- `shadow-apple-xl` - 超大阴影
- `shadow-apple-cyan` - 青色强调阴影
- `shadow-apple-purple` - 紫色强调阴影

## 样式替换对照表

### 背景色替换
```
旧: bg-gray-50 / bg-gray-100 → 新: bg-[#F5F5F7] / bg-apple-gray-light
旧: bg-white → 新: bg-[#FFFFFF] / bg-apple-white
```

### 文字颜色替换
```
旧: text-gray-900 → 新: text-[#1D1D1F] / text-apple-text-primary
旧: text-gray-600 / text-gray-700 → 新: text-[#86868B] / text-apple-text-secondary
```

### 圆角替换
```
旧: rounded-lg → 新: rounded-apple-md
旧: rounded-xl → 新: rounded-apple-lg
旧: rounded-2xl → 新: rounded-apple-xl
旧: rounded-3xl → 新: rounded-apple-2xl
```

### 阴影替换
```
旧: shadow-sm → 新: shadow-apple
旧: shadow-md → 新: shadow-apple-md
旧: shadow-lg → 新: shadow-apple-lg
旧: shadow-xl → 新: shadow-apple-xl
```

### 边框替换
```
旧: border-gray-300 → 新: border-[#E5E5E7]
```

## 使用示例

```tsx
// 卡片组件
<div className="bg-[#FFFFFF] rounded-apple-xl border border-[#E5E5E7] p-6 shadow-apple-lg">
  <h3 className="text-[#1D1D1F] text-xl font-bold mb-2">标题</h3>
  <p className="text-[#86868B]">辅助文字内容</p>
</div>

// 按钮组件
<button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-apple-lg shadow-apple-cyan">
  点击按钮
</button>
```
