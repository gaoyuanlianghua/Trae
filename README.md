# TRAE AutoPilot

🚀 **TRAE AutoPilot** - 具备自我操控能力的AI开发团队

## 项目概述

TRAE AutoPilot 是一个先进的智能开发辅助系统，集成了多个专业智能体，能够自动执行开发任务、修复错误、学习最佳实践，并通过多智能体协作解决复杂问题。

该项目提供两个版本：
- **Python版本**：功能更全面，包含多智能体协作和错误学习系统
- **Node.js版本**：轻量级实现，适合快速集成和简单任务

## 核心功能

- 🤖 **多智能体团队**：集成前端、后端、数据库、DevOps等专业智能体
- 🔧 **智能错误修复**：自动识别和修复常见开发错误
- 📚 **持续学习**：从错误和成功中学习，不断优化修复策略
- 🤝 **智能体协作**：通过MCP协议实现智能体间的高效协作
- 🔍 **项目扫描**：自动分析项目结构和依赖
- 🎯 **命令预测**：基于项目状态和历史预测下一步命令
- 🌐 **IDE集成**：支持VS Code和JetBrains IDEs
- 📦 **CI/CD集成**：支持GitHub Actions和GitLab CI/CD

## 安装

### Python版本

#### 基本安装
```bash
pip install trae-autopilot
```

#### 完整安装（包含所有功能）
```bash
pip install trae-autopilot[all]
```

### Node.js版本

```bash
# 克隆项目
git clone https://github.com/trae-project/autopilot.git
cd autopilot

# 安装依赖
npm install
```

## 快速开始

### Python版本

#### 启动完整服务

```bash
trae-autopilot serve \
    --agents react,nodejs,python,go \
    --enable-mcp \
    --enable-learning \
    --ide-port 8765 \
    --watch ./my-project \
    --shell
```

#### 扫描项目

```bash
trae-autopilot scan ./my-project --output-json
```

#### 预测命令

```bash
trae-autopilot predict --top 3 --min-confidence 0.8
```

#### 运行已学习的命令

```bash
trae-autopilot run build-project
```

#### 自动修复错误

```bash
trae-autopilot fix --retry 3
```

### Node.js版本

#### 启动服务

```bash
# 启动服务并监控项目
npm start -- ./my-project --watch

# 启动交互式控制台
npm start -- --shell
```

## 智能体类型

- **前端智能体**：React、Vue、TypeScript
- **后端智能体**：Node.js、Python、Go、Rust
- **数据库智能体**：SQL、NoSQL
- **DevOps智能体**：CI/CD、容器化、部署
- **移动开发智能体**：iOS、Android
- **游戏开发智能体**：Unity、Unreal
- **AI/ML智能体**：机器学习、深度学习
- **区块链智能体**：智能合约、DApp

## 技术架构

### Python版本

1. **核心层**：智能体管理、任务分配、通信协调
2. **学习层**：错误模式学习、命令记忆、性能优化
3. **集成层**：IDE插件、CI/CD集成、API接口
4. **扩展层**：自定义智能体、第三方服务集成

### Node.js版本

1. **命令中心**：任务分配和智能体协调
2. **智能体团队**：各专业智能体实现
3. **文件监控**：实时监控项目文件变化
4. **环境管理**：依赖检测和环境配置

## 配置

### Python版本

TRAE AutoPilot 使用环境变量和配置文件进行配置：

- `TRAE_AGENTS`：默认激活的智能体
- `TRAE_MCP_PORT`：MCP协调器端口
- `TRAE_LEARNING_DIR`：学习数据存储目录
- `TRAE_WATCH_PATH`：默认监控目录

### Node.js版本

使用 `config.js` 文件进行配置：

```javascript
module.exports = {
  agents: ['react', 'nodejs', 'python'],
  watchInterval: 1000,
  maxConcurrentTasks: 3
};
```

## IDE集成

### VS Code 扩展

1. 打开 VS Code
2. 安装 `vscode-trae-autopilot` 扩展
3. 使用 `TRAE AutoPilot: 启动` 命令启动服务

### JetBrains IDE 插件

1. 打开 JetBrains IDE（如 IntelliJ IDEA、PyCharm 等）
2. 安装 `TRAE AutoPilot` 插件
3. 在工具窗口中启动服务

## CI/CD集成

### GitHub Actions

使用 `.github/workflows/trae-autopilot.yml` 配置文件自动运行TRAE AutoPilot。

### GitLab CI/CD

使用 `.gitlab-ci.yml` 配置文件自动运行TRAE AutoPilot。

## 贡献

我们欢迎社区贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与项目。

## 许可证

TRAE AutoPilot 使用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 联系方式

- 官方网站：https://trae.ai
- 电子邮件：support@trae.ai
- GitHub：https://github.com/trae-project/autopilot

---

*由 TRAE Project 团队开发*