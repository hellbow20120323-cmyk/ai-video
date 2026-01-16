/**
 * Card 组件 - Apple 设计规范
 * 背景使用纯白，边框使用极浅的灰色（1px border #E5E5E5）
 * 或者在深色模式下使用毛玻璃效果（backdrop-blur-md bg-white/70）
 */

import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'glass'
  padding?: 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'md'
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const baseClasses = 'rounded-apple-xl shadow-apple-md'
  
  const variantClasses = variant === 'glass'
    ? 'backdrop-blur-md bg-white/70 border border-[#E5E5E5]/50'
    : 'bg-[#FFFFFF] border border-[#E5E5E5]'

  return (
    <div className={`${baseClasses} ${variantClasses} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  )
}
