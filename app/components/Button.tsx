/**
 * Button 组件 - Apple 设计规范
 * 主按钮使用深黑色背景（#000000）配纯白文字
 * 次级按钮使用浅灰色背景
 * 移除所有的渐变，使用平滑的缩放动画（active:scale-95）
 */

import React from 'react'
import { LucideIcon } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  const variantClasses = {
    primary: 'bg-[#000000] text-white hover:bg-[#1D1D1F] active:bg-[#2D2D2F]',
    secondary: 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E5E5E7] active:bg-[#D5D5D7]',
    ghost: 'bg-transparent text-[#1D1D1F] hover:bg-[#F5F5F7] active:bg-[#E5E5E7]',
  }

  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-semibold
    rounded-apple-lg
    transition-all duration-200
    active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
    shadow-apple
    ${fullWidth ? 'w-full' : ''}
  `

  const iconElement = Icon && (
    <Icon size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
  )

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {iconPosition === 'left' && iconElement}
      {children || (Icon && <span className="sr-only">按钮</span>)}
      {iconPosition === 'right' && iconElement}
    </button>
  )
}
