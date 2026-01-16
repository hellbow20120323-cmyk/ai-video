# Python 环境诊断报告

## 📊 当前状态

### Python 版本
- ✅ **python3**: Python 3.14.2（主要使用）
  - 路径: `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3`
- ✅ **系统 Python**: Python 3.9.6
  - 路径: `/usr/bin/python3`
- ❌ **python 命令**: 不可用（只有 `python3` 可用）

### pip 状态
- ✅ **pip3**: 版本 25.3（对应 Python 3.14）
  - 路径: `/Library/Frameworks/Python.framework/Versions/3.14/bin/pip3`
- ⚠️ **pip**: 版本 22.3.1（对应 Python 3.9）
  - 路径: `/usr/local/bin/pip`
  - **问题**: `pip` 和 `pip3` 指向不同的 Python 环境，可能导致包安装混乱

### Cursor 使用的 Python 解释器
- 当前解释器: `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3`
- Python 版本: 3.14.2

### PATH 环境变量
当前 PATH 包含（按优先级排序）:
1. `/Library/Frameworks/Python.framework/Versions/3.14/bin` ⚠️ **重复出现两次**
2. `/opt/homebrew/bin` (Homebrew)
3. `/usr/local/bin`
4. `/usr/bin` (系统 Python)

### 其他发现
- ✅ 检测到 pyenv 目录，但未正确配置（命令不可用）
- ❌ 未检测到 Conda/Anaconda
- ✅ Homebrew 已安装并配置

## ⚠️ 发现的问题

1. **pip 命令混乱**: `pip` 和 `pip3` 指向不同的 Python 环境
2. **PATH 重复**: Python 3.14 的路径在 PATH 中出现了两次
3. **python 命令缺失**: 没有 `python` 命令，只有 `python3`
4. **pyenv 未配置**: pyenv 存在但未正确初始化

## 🔧 修复建议

### 方案 1: 清理并统一 Python 环境（推荐）

#### 步骤 1: 创建 python 命令的符号链接
```bash
# 为 Python 3.14 创建 python 命令别名
sudo ln -sf /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 /usr/local/bin/python
```

#### 步骤 2: 统一 pip 命令
```bash
# 确保 pip 指向 Python 3.14
sudo ln -sf /Library/Frameworks/Python.framework/Versions/3.14/bin/pip3 /usr/local/bin/pip
```

#### 步骤 3: 清理 PATH 重复
编辑 `~/.zprofile`，确保 Python 路径只出现一次。

#### 步骤 4: 配置 pyenv（可选）
如果使用 pyenv，需要在 `~/.zshrc` 中添加：
```bash
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
```

### 方案 2: 使用 Homebrew 管理 Python（更推荐）

Homebrew 是 Mac 上管理 Python 的最佳方式，可以避免多个 Python 版本冲突。

#### 步骤 1: 使用 Homebrew 安装 Python
```bash
brew install python@3.12
# 或安装最新稳定版
brew install python
```

#### 步骤 2: 更新 PATH
在 `~/.zprofile` 中，将 Homebrew 的 Python 路径放在最前面：
```bash
export PATH="/opt/homebrew/bin:$PATH"
```

#### 步骤 3: 创建符号链接
```bash
brew link python@3.12
# 或
brew link python
```

### 方案 3: 配置 pyenv 管理多版本（适合需要多版本的用户）

#### 步骤 1: 初始化 pyenv
在 `~/.zshrc` 中添加：
```bash
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
```

#### 步骤 2: 安装 Python 版本
```bash
pyenv install 3.12.0
pyenv global 3.12.0
```

## 📝 推荐的 PATH 配置

在 `~/.zprofile` 中，建议的 PATH 顺序：

```bash
# Homebrew
eval $(/opt/homebrew/bin/brew shellenv)

# Python (如果使用 Homebrew 安装的 Python)
# export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"

# 或者使用系统安装的 Python 3.14（当前配置）
PATH="/Library/Frameworks/Python.framework/Versions/3.14/bin:${PATH}"
export PATH

# pyenv (如果使用)
# export PYENV_ROOT="$HOME/.pyenv"
# export PATH="$PYENV_ROOT/bin:$PATH"
# eval "$(pyenv init -)"
```

## ✅ 验证步骤

修复后，运行以下命令验证：

```bash
# 检查 Python 版本
python3 --version
python --version  # 如果创建了符号链接

# 检查 pip 版本
pip3 --version
pip --version  # 应该与 pip3 一致

# 检查解释器路径
which python3
which pip3

# 验证包安装
python3 -m pip list
```

## 🎯 针对 Cursor 的配置

Cursor 当前使用的 Python 解释器是：
- `/Library/Frameworks/Python.framework/Versions/3.14/bin/python3`

如果需要在 Cursor 中切换 Python 解释器：
1. 打开 Cursor 设置
2. 搜索 "python interpreter"
3. 选择你想要的 Python 解释器路径
