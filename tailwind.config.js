/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Apple 设计规范调色盘
        'apple-white': '#FFFFFF',
        'apple-gray-light': '#F5F5F7',
        'apple-text-primary': '#1D1D1F',
        'apple-text-secondary': '#86868B',
        // 保持兼容性
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        // Apple San Francisco 字体栈
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          '"Helvetica Neue"',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      letterSpacing: {
        // 略微缩小字间距
        tighter: '-0.01em',
        tight: '-0.005em',
      },
      borderRadius: {
        // Apple 风格的大圆角
        'apple-sm': '12px',
        'apple-md': '16px',
        'apple-lg': '20px',
        'apple-xl': '24px',
        'apple-2xl': '28px',
        'apple-3xl': '32px',
      },
      boxShadow: {
        // Apple 风格的软阴影
        'apple': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'apple-md': '0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.03)',
        'apple-lg': '0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
        'apple-xl': '0 12px 32px rgba(0, 0, 0, 0.1), 0 6px 12px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
