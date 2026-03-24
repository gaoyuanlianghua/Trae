const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { CommandMemory, AutoPilotMemory, DependencyProfile } = require('./memory');

class AutoPilot {
  constructor() {
    this.agent_id = 'auto-pilot-001';
    this.specialty = 'general';
    this.memory = new AutoPilotMemory();
    this.executionContext = {};
    this.debounceTimers = {};
    this.current_project = null;
    this.command_templates = {
      nodejs: {
        install: ['npm install'],
        test: ['npm test'],
        lint: ['npm run lint'],
        build: ['npm run build']
      },
      react: {
        install: ['npm install'],
        test: ['npm test'],
        lint: ['npm run lint'],
        build: ['npm run build']
      },
      python: {
        install: ['pip install -r requirements.txt'],
        test: ['python -m pytest'],
        lint: ['flake8'],
        build: ['python setup.py build']
      },
      go: {
        install: ['go mod tidy'],
        test: ['go test ./...'],
        lint: ['golint ./...'],
        build: ['go build ./...']
      },
      rust: {
        install: ['cargo build'],
        test: ['cargo test'],
        lint: ['cargo clippy'],
        build: ['cargo build --release']
      }
    };
    console.log('AutoPilot 初始化完成');
  }

  // 自动执行命令
  executeCommand(command, context = {}) {
    console.log(`执行命令: ${command}`);
    try {
      const startTime = Date.now();
      const result = execSync(command, { encoding: 'utf8', timeout: 30000 });
      const duration = (Date.now() - startTime) / 1000;
      
      // 记录命令到记忆系统
      this.memory.addCommandMemory([command], context, true, duration);
      this.memory.logSession({ type: 'command_executed', command, success: true, duration });
      
      console.log(`命令执行成功: ${command}`);
      return { success: true, result, duration };
    } catch (error) {
      const errorMessage = error.message || error.toString();
      const duration = (Date.now() - Date.now()) / 1000; // 失败时的持续时间
      
      // 记录错误到记忆系统
      this.memory.addCommandMemory([command], context, false, duration);
      this.memory.logSession({ type: 'command_executed', command, success: false, error: errorMessage });
      
      console.error(`命令执行失败: ${command}`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // 错误修复建议
  suggestFix(command, error) {
    const errorLower = error.toLowerCase();
    
    // 常见错误修复建议
    if (errorLower.includes('command not found')) {
      return '检查命令是否正确安装，或使用正确的命令名称';
    } else if (errorLower.includes('permission denied')) {
      return '尝试使用管理员权限执行命令，或检查文件权限';
    } else if (errorLower.includes('file not found')) {
      return '检查文件路径是否正确，或文件是否存在';
    } else if (errorLower.includes('syntax error')) {
      return '检查命令语法是否正确';
    } else if (errorLower.includes('npm')) {
      return '尝试运行 npm install 安装依赖';
    } else if (errorLower.includes('pip')) {
      return '尝试运行 pip install 安装依赖';
    }
    
    return '检查命令执行环境和参数是否正确';
  }

  // 自动错误修复
  autoFixError(errorInfo) {
    const { command, error } = errorInfo;
    
    console.log(`尝试自动修复错误: ${command}`);
    console.log(`错误信息: ${error}`);
    console.log(`建议修复: ${this.suggestFix(command, error)}`);
    
    // 根据错误类型执行修复命令
    const errorLower = error.toLowerCase();
    let fixCommand = null;
    
    if (errorLower.includes('npm') && (errorLower.includes('missing') || errorLower.includes('not found'))) {
      fixCommand = 'npm install';
    } else if (errorLower.includes('pip') && errorLower.includes('not found')) {
      fixCommand = 'pip install -r requirements.txt';
    }
    
    if (fixCommand) {
      console.log(`执行修复命令: ${fixCommand}`);
      const result = this.executeCommand(fixCommand, { originalCommand: command });
      return result.success;
    }
    
    return false;
  }

  // 批量执行命令
  executeCommands(commands, context = {}) {
    console.log(`执行命令序列: ${commands.length} 条命令`);
    const results = [];
    let allSuccess = true;
    
    for (const command of commands) {
      const result = this.executeCommand(command, context);
      results.push(result);
      if (!result.success) {
        allSuccess = false;
        // 尝试自动修复
        this.autoFixError({ command, error: result.error });
      }
    }
    
    // 记录命令序列到记忆系统
    this.memory.addCommandMemory(commands, context, allSuccess, results.reduce((sum, r) => sum + (r.duration || 0), 0));
    
    return { success: allSuccess, results };
  }

  // 分析项目依赖
  analyzeDependencies(projectPath = process.cwd()) {
    console.log(`分析项目依赖: ${projectPath}`);
    
    let projectType = 'unknown';
    const detectedFiles = [];
    const dependencies = {};
    const devDependencies = {};
    const installCommands = [];
    const testCommands = [];
    const lintCommands = [];
    
    // 检查package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      projectType = 'node';
      detectedFiles.push('package.json');
      
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        dependencies = packageJson.dependencies || {};
        devDependencies = packageJson.devDependencies || {};
        installCommands.push('npm install');
        
        if (packageJson.scripts) {
          if (packageJson.scripts.test) {
            testCommands.push(`npm run test`);
          }
          if (packageJson.scripts.lint) {
            lintCommands.push(`npm run lint`);
          }
        }
      } catch (error) {
        console.error('读取package.json失败:', error.message);
      }
    }
    
    // 检查requirements.txt
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      projectType = 'python';
      detectedFiles.push('requirements.txt');
      installCommands.push('pip install -r requirements.txt');
    }
    
    // 检查go.mod
    const goModPath = path.join(projectPath, 'go.mod');
    if (fs.existsSync(goModPath)) {
      projectType = 'go';
      detectedFiles.push('go.mod');
      installCommands.push('go mod tidy');
    }
    
    // 检查Cargo.toml
    const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
    if (fs.existsSync(cargoTomlPath)) {
      projectType = 'rust';
      detectedFiles.push('Cargo.toml');
      installCommands.push('cargo build');
    }
    
    // 创建依赖画像
    const profile = new DependencyProfile(
      projectPath,
      projectType,
      detectedFiles,
      dependencies,
      devDependencies,
      installCommands,
      testCommands,
      lintCommands
    );
    
    // 保存到记忆系统
    this.memory.addDependencyProfile(profile);
    this.memory.logSession({ type: 'dependency_analyzed', projectPath, projectType });
    
    console.log(`依赖分析完成: ${projectType}`);
    return profile;
  }

  // 智能命令推荐
  recommendCommands(context) {
    console.log('推荐命令...');
    const memories = this.memory.searchCommandMemories(context);
    
    const recommendations = memories.slice(0, 5).map(item => ({
      commands: item.memory.commands,
      successRate: item.memory.successRate,
      useCount: item.memory.useCount,
      score: item.score
    }));
    
    console.log(`找到 ${recommendations.length} 个推荐命令`);
    return recommendations;
  }

  // 获取命令历史
  getCommandHistory(limit = 100) {
    return Object.values(this.memory.commands).slice(-limit);
  }

  // 获取依赖画像
  getDependencyProfile(projectPath = process.cwd()) {
    return this.memory.getDependencyProfile(projectPath);
  }

  // 清理历史记录
  clearHistory() {
    // 这里可以实现清理逻辑
    console.log('历史记录已清理');
  }

  // 设置执行上下文
  setExecutionContext(key, value) {
    this.executionContext[key] = value;
    console.log(`设置执行上下文: ${key} = ${value}`);
  }

  // 获取执行上下文
  getExecutionContext(key) {
    return this.executionContext[key];
  }

  // 学习命令序列
  learn(name, commands, context = {}) {
    const cmdText = commands.join('; ');
    const cmdHash = this._generateHash(`${this.specialty}:${name}:${cmdText}`).substring(0, 12);
    
    // 创建命令记忆
    const memory = new CommandMemory(
      cmdHash,
      commands,
      context || {},
      1.0,
      new Date(),
      0,
      0.0
    );
    
    // 存储到记忆系统
    const key = `${this.specialty}:${name}`;
    this.memory.commands[key] = memory;
    this.memory.save();
    
    console.log(`[${this.agent_id}] 💾 学习命令序列 '${name}': ${cmdHash}`);
    return cmdHash;
  }

  // 执行学习的命令序列
  run(name, envVars = {}) {
    const key = `${this.specialty}:${name}`;
    const memory = this.memory.commands[key];
    
    if (!memory) {
      // 尝试模糊匹配或智能推荐
      return this._smartExecute(name, envVars);
    }
    
    console.log(`[${this.agent_id}] ▶️ 执行 '${name}' (${memory.cmdHash})`);
    
    const results = [];
    const start = Date.now();
    
    for (const cmd of memory.commands) {
      const result = this._exec(cmd, envVars);
      results.push(result);
      
      if (result.returncode !== 0) {
        // 执行失败，尝试自动修复
        const fixed = this._autoFix(cmd, result, envVars);
        if (fixed) {
          const fixedResult = this._exec(fixed, envVars);
          results.push(fixedResult);
        }
      }
    }
    
    const duration = (Date.now() - start) / 1000;
    
    // 更新记忆统计
    memory.useCount += 1;
    memory.lastUsed = new Date();
    memory.avgDuration = (memory.avgDuration * (memory.useCount - 1) + duration) / memory.useCount;
    memory.successRate = results.filter(r => r.returncode === 0).length / results.length;
    
    this.memory.save();
    
    return results[results.length - 1] || null;
  }

  // 扫描项目依赖，建立完整画像
  scan(projectPath = process.cwd()) {
    const path = require('path').resolve(projectPath);
    
    const detectedFiles = [];
    let projectType = null;
    const deps = {};
    const devDeps = {};
    
    // 检测项目类型
    const detectionOrder = [
      ['rust', ['Cargo.toml', 'Cargo.lock']],
      ['python', ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile', 'poetry.lock']],
      ['react', ['vite.config.ts', 'next.config.js', 'remix.config.js', 'src/App.tsx']],
      ['nodejs', ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']],
      ['go', ['go.mod', 'go.sum']]
    ];
    
    for (const [ptype, markers] of detectionOrder) {
      for (const marker of markers) {
        if (fs.existsSync(require('path').join(path, marker))) {
          projectType = ptype;
          detectedFiles.push(marker);
          break;
        }
      }
      if (projectType) {
        break;
      }
    }
    
    // 解析依赖
    if (projectType === 'python') {
      const parsed = this._parsePythonDeps(path);
      Object.assign(deps, parsed.deps);
      Object.assign(devDeps, parsed.devDeps);
    } else if (projectType === 'nodejs' || projectType === 'react') {
      const parsed = this._parseNodeDeps(path);
      Object.assign(deps, parsed.deps);
      Object.assign(devDeps, parsed.devDeps);
    } else if (projectType === 'go') {
      Object.assign(deps, this._parseGoDeps(path));
    } else if (projectType === 'rust') {
      Object.assign(deps, this._parseRustDeps(path));
    }
    
    // 生成完整命令集
    const templates = this.specialty === projectType ? this.command_templates[projectType] || {} : {};
    const installCommands = templates.install || [];
    const testCommands = templates.test || [];
    const lintCommands = templates.lint || [];
    
    // 创建依赖画像
    const profile = new DependencyProfile(
      path,
      projectType || 'unknown',
      detectedFiles,
      deps,
      devDeps,
      installCommands,
      testCommands,
      lintCommands,
      new Date()
    );
    
    // 保存到记忆系统
    this.memory.dependencies[path] = profile;
    this.current_project = profile;
    this.memory.save();
    
    console.log(`[${this.agent_id}] 🔍 扫描完成: ${projectType} @ ${path}`);
    console.log(`   依赖: ${Object.keys(deps).length} 个, 开发依赖: ${Object.keys(devDeps).length} 个`);
    
    return profile;
  }

  // 预测下一步命令
  predict(recentContext = null) {
    if (!this.current_project) {
      return [];
    }
    
    const predictions = [];
    
    // 1. 基于历史记忆预测
    const recentCmds = recentContext || this._getRecentCommands(5);
    
    // 查找相似上下文的成功命令序列
    for (const [key, memory] of Object.entries(this.memory.commands)) {
      if (!key.startsWith(this.specialty)) {
        continue;
      }
      
      const similarity = this._contextSimilarity(recentCmds, memory.context.after || []);
      if (similarity > 0.7) {
        predictions.push({
          type: 'memory',
          confidence: similarity * memory.successRate,
          commands: memory.commands,
          source: key,
          reason: `历史成功率 ${(memory.successRate * 100).toFixed(0)}%`
        });
      }
    }
    
    // 2. 基于项目状态预测
    if (this.current_project) {
      // 检查是否需要安装依赖
      if (!this.current_project.projectPath.includes('node_modules') && 
          ['nodejs', 'react'].includes(this.current_project.projectType)) {
        const nodeModulesPath = require('path').join(this.current_project.projectPath, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
          predictions.push({
            type: 'dependency',
            confidence: 0.95,
            commands: this.current_project.installCommands.slice(0, 1),
            reason: 'node_modules 缺失'
          });
        }
      }
      
      // 检查Git状态
      try {
        const gitStatus = this._exec('git status --porcelain', { cwd: this.current_project.projectPath });
        if (gitStatus.stdout.trim()) {
          predictions.push({
            type: 'git',
            confidence: 0.8,
            commands: ['git add -A', 'git status'],
            reason: '有未跟踪的修改'
          });
        }
      } catch (error) {
        // Git可能未初始化，忽略错误
      }
    }
    
    // 按置信度排序
    predictions.sort((a, b) => b.confidence - a.confidence);
    
    return predictions.slice(0, 3);
  }

  // 辅助方法: 生成哈希
  _generateHash(data) {
    return require('crypto').createHash('md5').update(data).digest('hex');
  }

  // 辅助方法: 执行命令
  _exec(cmd, envVars = {}, cwd = null) {
    const env = { ...process.env, ...(envVars || {}) };
    const workingDir = cwd || (this.current_project ? this.current_project.projectPath : null);
    
    console.log(`[${this.agent_id}] $ ${cmd}`);
    
    let result;
    try {
      result = require('child_process').execSync(cmd, { 
        encoding: 'utf8', 
        timeout: 300000, // 5分钟超时
        env,
        cwd: workingDir
      });
      result = { returncode: 0, stdout: result, stderr: '' };
    } catch (error) {
      result = { 
        returncode: error.status || 1, 
        stdout: error.stdout || '', 
        stderr: error.stderr || error.message 
      };
    }
    
    // 记录会话
    this.memory.logSession({
      agent: this.agent_id,
      cmd: cmd,
      cwd: workingDir,
      exit_code: result.returncode,
      stdout_preview: result.stdout.substring(0, 500),
      stderr_preview: result.stderr.substring(0, 500)
    });
    
    if (result.returncode === 0) {
      console.log(`  ✓ 成功 (${result.stdout.length} 字节输出)`);
    } else {
      console.log(`  ✗ 失败 (代码 ${result.returncode})`);
      if (result.stderr) {
        console.log(`  错误: ${result.stderr.substring(0, 200)}`);
      }
    }
    
    return result;
  }

  // 辅助方法: 自动修复命令
  _autoFix(cmd, result, envVars = {}) {
    const stderr = result.stderr ? result.stderr.toLowerCase() : '';
    const stdout = result.stdout ? result.stdout.toLowerCase() : '';
    const combined = stderr + stdout;
    
    const fixes = [];
    
    // Python 导入错误
    if (combined.includes('modulenotfounderror') || combined.includes('importerror')) {
      const match = combined.match(/no module named ["']([^"']+)["']/);
      if (match) {
        const pkg = match[1];
        fixes.push(`pip install ${pkg}`);
      }
    }
    
    // Node 模块缺失
    if (combined.includes('cannot find module') || combined.includes("error: cannot find module")) {
      fixes.push('npm install');
    }
    
    // TypeScript 类型缺失
    if (combined.includes("could not find a declaration file for module")) {
      const match = combined.match(/module ["']([^"']+)["']/);
      if (match) {
        const pkg = match[1];
        const typesPkg = pkg.replace('@', '').replace('/', '__');
        fixes.push(`npm install --save-dev @types/${typesPkg}`);
      }
    }
    
    // Go 模块缺失
    if (combined.includes('go: module') && combined.includes('not found')) {
      fixes.push('go mod tidy');
    }
    
    // Rust 特性门
    if (combined.includes('feature') && combined.includes('is not found')) {
      fixes.push('rustup update');
    }
    
    // 执行修复
    for (const fix_cmd of fixes) {
      console.log(`[${this.agent_id}] 🔧 自动修复: ${fix_cmd}`);
      const fix_result = this._exec(fix_cmd, envVars);
      if (fix_result.returncode === 0) {
        // 重试原命令
        const retry_result = this._exec(cmd, envVars);
        if (retry_result.returncode === 0) {
          // 学习这个修复模式
          const fixHash = this._generateHash(cmd).substring(0, 6);
          this.learn(`fix_${fixHash}`, [fix_cmd, cmd], {'error_pattern': combined.substring(0, 100), 'fixed': true});
          return fix_cmd;
        }
      }
    }
    
    return null;
  }

  // 辅助方法: 智能执行
  _smartExecute(name, envVars = {}) {
    console.log(`[${this.agent_id}] 🤔 智能执行: ${name}`);
    
    // 尝试理解自然语言命令
    const cmdMap = {
      'test': 'test',
      'run test': 'test',
      '检查': 'lint',
      'lint': 'lint',
      'build': 'build',
      '编译': 'build',
      '安装': 'install',
      'install': 'install',
    };
    
    const lowerName = name.toLowerCase();
    for (const [keyword, action] of Object.entries(cmdMap)) {
      if (lowerName.includes(keyword)) {
        if (this.command_templates && this.command_templates[action]) {
          const cmd = this.command_templates[action][0];
          return this._exec(cmd, envVars);
        }
      }
    }
    
    // 抛出错误
    const error = new Error(`未知命令 '${name}'，请先使用 learn 学习`);
    error.returncode = 1;
    error.stdout = '';
    error.stderr = `未知命令 '${name}'，请先使用 learn 学习`;
    return error;
  }

  // 辅助方法: 解析Python依赖
  _parsePythonDeps(path) {
    const deps = {};
    const devDeps = {};
    
    const reqFile = require('path').join(path, 'requirements.txt');
    if (fs.existsSync(reqFile)) {
      try {
        const content = fs.readFileSync(reqFile, 'utf8');
        content.split('\n').forEach(line => {
          line = line.trim();
          if (line && !line.startsWith('#')) {
            if (line.includes('==')) {
              const parts = line.split('==');
              const name = parts[0];
              const version = parts.slice(1).join('==');
              deps[name] = version;
            } else {
              deps[line] = '*';
            }
          }
        });
      } catch (error) {
        console.error('解析Python依赖失败:', error.message);
      }
    }
    
    const pyproject = require('path').join(path, 'pyproject.toml');
    if (fs.existsSync(pyproject)) {
      // 简化解析，实际可用toml库
      try {
        const content = fs.readFileSync(pyproject, 'utf8');
        if (content.includes('[tool.poetry.dependencies]')) {
          // Poetry格式 - 简化处理
        }
      } catch (error) {
        console.error('解析pyproject.toml失败:', error.message);
      }
    }
    
    return { deps, devDeps };
  }

  // 辅助方法: 解析Node.js依赖
  _parseNodeDeps(path) {
    const packageJsonPath = require('path').join(path, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return { deps: {}, devDeps: {} };
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return {
        deps: data.dependencies || {},
        devDeps: data.devDependencies || {}
      };
    } catch (error) {
      console.error('解析Node.js依赖失败:', error.message);
      return { deps: {}, devDeps: {} };
    }
  }

  // 辅助方法: 解析Go依赖
  _parseGoDeps(path) {
    const goModPath = require('path').join(path, 'go.mod');
    if (!fs.existsSync(goModPath)) {
      return {};
    }
    
    const deps = {};
    let inRequire = false;
    
    try {
      const content = fs.readFileSync(goModPath, 'utf8');
      content.split('\n').forEach(line => {
        line = line.trim();
        if (line === 'require (') {
          inRequire = true;
        } else if (inRequire && line === ')') {
          inRequire = false;
        } else if (inRequire || line.startsWith('require ')) {
          // 解析依赖
          const parts = line.replace('require ', '').trim().split(/\s+/);
          if (parts.length >= 2) {
            deps[parts[0]] = parts[1];
          }
        }
      });
    } catch (error) {
      console.error('解析Go依赖失败:', error.message);
    }
    
    return deps;
  }

  // 辅助方法: 解析Rust依赖
  _parseRustDeps(path) {
    const cargoTomlPath = require('path').join(path, 'Cargo.toml');
    if (!fs.existsSync(cargoTomlPath)) {
      return {};
    }
    
    const deps = {};
    let inDeps = false;
    
    try {
      const content = fs.readFileSync(cargoTomlPath, 'utf8');
      content.split('\n').forEach(line => {
        line = line.trim();
        if (line === '[dependencies]') {
          inDeps = true;
        } else if (line.startsWith('[') && inDeps) {
          inDeps = false;
        } else if (inDeps && line.includes('=')) {
          const parts = line.split('=');
          const name = parts[0];
          const version = parts.slice(1).join('=');
          deps[name.trim()] = version.trim().replace(/['"]/g, '');
        }
      });
    } catch (error) {
      console.error('解析Rust依赖失败:', error.message);
    }
    
    return deps;
  }

  // 辅助方法: 获取最近命令
  _getRecentCommands(n = 5) {
    const sessionLogPath = require('path').join(this.memory.MEMORY_DIR, 'session.jsonl');
    if (!fs.existsSync(sessionLogPath)) {
      return [];
    }
    
    try {
      const content = fs.readFileSync(sessionLogPath, 'utf8');
      const lines = content.trim().split('\n');
      const recent = [];
      
      // 从后往前读取，最多读取n*2行来过滤
      for (let i = lines.length - 1; i >= 0 && recent.length < n; i--) {
        try {
          const data = JSON.parse(lines[i]);
          if (data.agent === this.agent_id && data.exit_code === 0) {
            recent.push(data.cmd);
          }
        } catch (error) {
          // 忽略解析错误
          continue;
        }
      }
      
      // 反转顺序，返回最近的命令在前
      return recent.reverse();
    } catch (error) {
      console.error('读取会话日志失败:', error.message);
      return [];
    }
  }

  // 辅助方法: 计算上下文相似度
  _contextSimilarity(recent, context) {
    if (!recent || !context || recent.length === 0 || context.length === 0) {
      return 0.0;
    }
    
    // 简单的Jaccard相似度
    const set1 = new Set(recent);
    const set2 = new Set(context);
    
    // 计算交集
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    // 计算并集
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0.0;
  }
  
  // 文件变化自动触发 (带防抖)
  on_file_change(file_path, debounce_ms = 500) {
    const abs_path = require('path').resolve(file_path);
    const ext = require('path').extname(abs_path);
    const filename = require('path').basename(abs_path);
    
    // 防抖：取消之前的定时器
    const timer_key = require('path').dirname(abs_path);
    if (this.debounceTimers[timer_key]) {
      clearTimeout(this.debounceTimers[timer_key]);
    }
    
    const execute_triggers = () => {
      const triggers = this.command_templates?.file_triggers || {};
      const commands_to_run = [];
      
      // 匹配文件扩展名触发
      if (triggers[ext]) {
        commands_to_run.push(...triggers[ext]);
      }
      
      // 匹配文件名触发
      if (triggers[filename]) {
        commands_to_run.push(...triggers[filename]);
      }
      
      // 执行命令
      const unique_commands = [...new Set(commands_to_run)];
      for (const cmd_name of unique_commands) {
        if (this.command_templates && this.command_templates[cmd_name]) {
          const actual_cmd = this.command_templates[cmd_name][0]; // 取第一个
          console.log(`[${this.agent_id}] 🔄 自动触发: ${cmd_name}`);
          const result = this._exec(actual_cmd, {}, require('path').dirname(abs_path));
          
          if (result.returncode !== 0) {
            this._autoFix(actual_cmd, result, {});
          }
        }
      }
    };
    
    // 设置防抖定时器
    this.debounceTimers[timer_key] = setTimeout(execute_triggers, debounce_ms);
  }
}

module.exports = AutoPilot;