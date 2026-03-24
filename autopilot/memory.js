const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CommandMemory {
  constructor(cmdHash, commands, context, successRate = 0, lastUsed = new Date(), useCount = 0, avgDuration = 0) {
    this.cmdHash = cmdHash;
    this.commands = commands;
    this.context = context;
    this.successRate = successRate;
    this.lastUsed = lastUsed;
    this.useCount = useCount;
    this.avgDuration = avgDuration;
  }

  toJSON() {
    return {
      cmdHash: this.cmdHash,
      commands: this.commands,
      context: this.context,
      successRate: this.successRate,
      lastUsed: this.lastUsed.toISOString(),
      useCount: this.useCount,
      avgDuration: this.avgDuration
    };
  }

  static fromJSON(data) {
    return new CommandMemory(
      data.cmdHash,
      data.commands,
      data.context,
      data.successRate,
      new Date(data.lastUsed),
      data.useCount,
      data.avgDuration
    );
  }
}

class DependencyProfile {
  constructor(projectPath, projectType, detectedFiles = [], dependencies = {}, devDependencies = {}, installCommands = [], testCommands = [], lintCommands = [], lastScan = new Date()) {
    this.projectPath = projectPath;
    this.projectType = projectType;
    this.detectedFiles = detectedFiles;
    this.dependencies = dependencies;
    this.devDependencies = devDependencies;
    this.installCommands = installCommands;
    this.testCommands = testCommands;
    this.lintCommands = lintCommands;
    this.lastScan = lastScan;
  }

  toJSON() {
    return {
      projectPath: this.projectPath,
      projectType: this.projectType,
      detectedFiles: this.detectedFiles,
      dependencies: this.dependencies,
      devDependencies: this.devDependencies,
      installCommands: this.installCommands,
      testCommands: this.testCommands,
      lintCommands: this.lintCommands,
      lastScan: this.lastScan.toISOString()
    };
  }

  static fromJSON(data) {
    return new DependencyProfile(
      data.projectPath,
      data.projectType,
      data.detectedFiles,
      data.dependencies,
      data.devDependencies,
      data.installCommands,
      data.testCommands,
      data.lintCommands,
      new Date(data.lastScan)
    );
  }
}

class AutoPilotMemory {
  constructor() {
    this.MEMORY_DIR = path.join(require('os').homedir(), '.trae_autopilot');
    this.commandDb = path.join(this.MEMORY_DIR, 'commands.json');
    this.dependencyDb = path.join(this.MEMORY_DIR, 'dependencies.json');
    this.sessionLog = path.join(this.MEMORY_DIR, 'session.jsonl');
    
    this._ensureMemoryDir();
    this._loadDatabases();
  }

  _ensureMemoryDir() {
    if (!fs.existsSync(this.MEMORY_DIR)) {
      fs.mkdirSync(this.MEMORY_DIR, { recursive: true });
    }
  }

  _loadDatabases() {
    this.commands = {};
    this.dependencies = {};
    
    if (fs.existsSync(this.commandDb)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.commandDb, 'utf8'));
        for (const [k, v] of Object.entries(data)) {
          this.commands[k] = CommandMemory.fromJSON(v);
        }
      } catch (error) {
        console.error('加载命令数据库失败:', error.message);
        this.commands = {};
      }
    }
    
    if (fs.existsSync(this.dependencyDb)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.dependencyDb, 'utf8'));
        for (const [k, v] of Object.entries(data)) {
          this.dependencies[k] = DependencyProfile.fromJSON(v);
        }
      } catch (error) {
        console.error('加载依赖数据库失败:', error.message);
        this.dependencies = {};
      }
    }
  }

  save() {
    try {
      const commandsData = {};
      for (const [k, v] of Object.entries(this.commands)) {
        commandsData[k] = v.toJSON();
      }
      fs.writeFileSync(this.commandDb, JSON.stringify(commandsData, null, 2));
      
      const dependenciesData = {};
      for (const [k, v] of Object.entries(this.dependencies)) {
        dependenciesData[k] = v.toJSON();
      }
      fs.writeFileSync(this.dependencyDb, JSON.stringify(dependenciesData, null, 2));
      
      console.log('记忆系统已保存');
    } catch (error) {
      console.error('保存记忆系统失败:', error.message);
    }
  }

  logSession(event) {
    try {
      const logEntry = {
        ts: new Date().toISOString(),
        ...event
      };
      fs.appendFileSync(this.sessionLog, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('记录会话日志失败:', error.message);
    }
  }

  // 生成命令哈希
  generateCommandHash(commands, context) {
    const data = JSON.stringify({ commands, context });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // 添加命令记忆
  addCommandMemory(commands, context, success, duration) {
    const cmdHash = this.generateCommandHash(commands, context);
    let memory = this.commands[cmdHash];
    
    if (memory) {
      // 更新现有记忆
      memory.useCount += 1;
      memory.successRate = ((memory.successRate * (memory.useCount - 1)) + (success ? 1 : 0)) / memory.useCount;
      memory.avgDuration = ((memory.avgDuration * (memory.useCount - 1)) + duration) / memory.useCount;
      memory.lastUsed = new Date();
    } else {
      // 创建新记忆
      memory = new CommandMemory(
        cmdHash,
        commands,
        context,
        success ? 1 : 0,
        new Date(),
        1,
        duration
      );
      this.commands[cmdHash] = memory;
    }
    
    this.save();
    return memory;
  }

  // 添加依赖画像
  addDependencyProfile(profile) {
    const key = profile.projectPath;
    this.dependencies[key] = profile;
    this.save();
  }

  // 获取命令记忆
  getCommandMemory(cmdHash) {
    return this.commands[cmdHash];
  }

  // 获取依赖画像
  getDependencyProfile(projectPath) {
    return this.dependencies[projectPath];
  }

  // 搜索相关命令记忆
  searchCommandMemories(context) {
    const results = [];
    for (const memory of Object.values(this.commands)) {
      // 简单的上下文匹配
      const matchScore = this._calculateContextMatch(memory.context, context);
      if (matchScore > 0) {
        results.push({ memory, score: matchScore });
      }
    }
    
    // 按匹配分数和成功率排序
    results.sort((a, b) => {
      return (b.score * b.memory.successRate) - (a.score * a.memory.successRate);
    });
    
    return results;
  }

  // 计算上下文匹配分数
  _calculateContextMatch(memoryContext, queryContext) {
    let score = 0;
    for (const [key, value] of Object.entries(queryContext)) {
      if (memoryContext[key] === value) {
        score += 1;
      }
    }
    return score;
  }
}

module.exports = {
  CommandMemory,
  DependencyProfile,
  AutoPilotMemory
};