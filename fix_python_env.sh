#!/bin/bash

# Python 环境修复脚本
# 此脚本需要管理员权限来创建符号链接

echo "🔧 开始修复 Python 环境..."
echo ""

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  此脚本需要管理员权限"
    echo "请运行: sudo bash fix_python_env.sh"
    exit 1
fi

PYTHON314_BIN="/Library/Frameworks/Python.framework/Versions/3.14/bin"
USR_LOCAL_BIN="/usr/local/bin"

echo "1️⃣  创建 python 命令的符号链接..."
if [ -f "$PYTHON314_BIN/python3" ]; then
    ln -sf "$PYTHON314_BIN/python3" "$USR_LOCAL_BIN/python"
    echo "   ✅ 已创建: $USR_LOCAL_BIN/python -> $PYTHON314_BIN/python3"
else
    echo "   ❌ 错误: 找不到 Python 3.14"
fi

echo ""
echo "2️⃣  统一 pip 命令指向 Python 3.14..."
if [ -f "$PYTHON314_BIN/pip3" ]; then
    # 备份旧的 pip（如果存在且不是符号链接）
    if [ -f "$USR_LOCAL_BIN/pip" ] && [ ! -L "$USR_LOCAL_BIN/pip" ]; then
        mv "$USR_LOCAL_BIN/pip" "$USR_LOCAL_BIN/pip.backup.$(date +%Y%m%d_%H%M%S)"
        echo "   📦 已备份旧的 pip 到 pip.backup.*"
    fi
    ln -sf "$PYTHON314_BIN/pip3" "$USR_LOCAL_BIN/pip"
    echo "   ✅ 已创建: $USR_LOCAL_BIN/pip -> $PYTHON314_BIN/pip3"
else
    echo "   ❌ 错误: 找不到 pip3"
fi

echo ""
echo "3️⃣  验证修复结果..."
echo ""
echo "Python 版本:"
python3 --version 2>/dev/null || echo "   python3 不可用"
python --version 2>/dev/null || echo "   python 不可用（需要重新加载 shell）"

echo ""
echo "pip 版本:"
pip3 --version 2>/dev/null || echo "   pip3 不可用"
pip --version 2>/dev/null || echo "   pip 不可用（需要重新加载 shell）"

echo ""
echo "✅ 修复完成！"
echo ""
echo "📝 注意: 请重新打开终端或运行 'source ~/.zprofile' 来使更改生效"
