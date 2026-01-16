/**
 * Input 组件 - Apple 设计规范
 * 背景设为浅灰色（#F5F5F7），点击聚焦时增加淡蓝色的环绕光晕
 */

import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-[#1D1D1F] mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full
          px-4 py-3
          bg-[#F5F5F7]
          border border-[#E5E5E5]
          rounded-apple-lg
          text-[#1D1D1F]
          placeholder:text-[#86868B]
          focus:outline-none
          focus:border-[#007AFF]
          focus:ring-4
          focus:ring-[#007AFF]/10
          transition-all duration-200
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-[#86868B]">{helperText}</p>
      )}
    </div>
  )
}
