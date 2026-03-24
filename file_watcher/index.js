const fs = require('fs');
const path = require('path');

class FileWatcher {
  constructor(options = {}) {
    this.watchers = {};
    this.workflows = {};
    this.fileHistory = [];
    this.maxHistory = 100;
    this.fileChangeCallback = options.fileChangeCallback;
  }

  // 启动文件监控
  startWatching(directory, options = {}) {
    const { pattern = '*', recursive = true, ignore = [] } = options;
    const watchPath = path.resolve(directory);
    
    if (!fs.existsSync(watchPath)) {
      console.error('监控目录不存在:', watchPath);
      return false;
    }
    
    console.log(`开始监控目录: ${watchPath}`);
    
    try {
      const watcher = fs.watch(watchPath, { recursive }, (eventType, filename) => {
        if (!filename) return;
        
        // 检查是否在忽略列表中
        if (this.shouldIgnore(filename, ignore)) {
          return;
        }
        
        // 检查文件模式匹配
        if (!this.matchesPattern(filename, pattern)) {
          return;
        }
        
        const filePath = path.join(watchPath, filename);
        this.handleFileChange(eventType, filePath);
      });
      
      this.watchers[watchPath] = { watcher, options };
      console.log(`监控启动成功: ${watchPath}`);
      return true;
    } catch (error) {
      console.error('启动监控失败:', error.message);
      return false;
    }
  }

  // 停止文件监控
  stopWatching(directory) {
    const watchPath = path.resolve(directory);
    if (this.watchers[watchPath]) {
      this.watchers[watchPath].watcher.close();
      delete this.watchers[watchPath];
      console.log(`监控停止: ${watchPath}`);
      return true;
    }
    return false;
  }

  // 停止所有监控
  stopAllWatching() {
    Object.keys(this.watchers).forEach(watchPath => {
      this.stopWatching(watchPath);
    });
  }

  // 处理文件变化
  handleFileChange(eventType, filePath) {
    const fileEvent = {
      id: `event-${Date.now()}`,
      eventType,
      filePath,
      timestamp: new Date().toISOString()
    };
    
    this.fileHistory.push(fileEvent);
    if (this.fileHistory.length > this.maxHistory) {
      this.fileHistory.shift();
    }
    
    console.log(`文件变化: ${eventType} - ${filePath}`);
    
    // 调用文件变化回调
    if (this.fileChangeCallback) {
      this.fileChangeCallback(filePath);
    }
    
    // 触发工作流
    this.triggerWorkflows(fileEvent);
  }

  // 注册工作流
  registerWorkflow(name, workflow) {
    this.workflows[name] = workflow;
    console.log(`工作流注册成功: ${name}`);
  }

  // 触发工作流
  triggerWorkflows(fileEvent) {
    Object.keys(this.workflows).forEach(workflowName => {
      const workflow = this.workflows[workflowName];
      try {
        if (workflow.condition && workflow.condition(fileEvent)) {
          console.log(`触发工作流: ${workflowName}`);
          workflow.action(fileEvent);
        }
      } catch (error) {
        console.error(`工作流执行失败 ${workflowName}:`, error.message);
      }
    });
  }

  // 检查是否忽略文件
  shouldIgnore(filename, ignoreList) {
    return ignoreList.some(pattern => {
      if (pattern.startsWith('*') && pattern.endsWith('*')) {
        const middle = pattern.slice(1, -1);
        return filename.includes(middle);
      } else if (pattern.startsWith('*')) {
        const suffix = pattern.slice(1);
        return filename.endsWith(suffix);
      } else if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        return filename.startsWith(prefix);
      }
      return filename === pattern;
    });
  }

  // 检查文件是否匹配模式
  matchesPattern(filename, pattern) {
    if (pattern === '*') return true;
    
    if (pattern.startsWith('*') && pattern.endsWith('*')) {
      const middle = pattern.slice(1, -1);
      return filename.includes(middle);
    } else if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      return filename.endsWith(suffix);
    } else if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return filename.startsWith(prefix);
    }
    return filename === pattern;
  }

  // 获取文件变化历史
  getFileHistory(limit = 50) {
    return this.fileHistory.slice(-limit);
  }

  // 获取监控状态
  getWatchStatus() {
    return {
      watching: Object.keys(this.watchers),
      workflows: Object.keys(this.workflows),
      fileHistoryCount: this.fileHistory.length
    };
  }

  // 注册常见工作流
  registerCommonWorkflows() {
    // 代码文件变化时自动测试
    this.registerWorkflow('auto-test', {
      condition: (event) => {
        const ext = path.extname(event.filePath);
        return ['.js', '.jsx', '.ts', '.tsx', '.py'].includes(ext);
      },
      action: (event) => {
        console.log(`执行自动测试: ${event.filePath}`);
        // 这里可以执行测试命令
      }
    });
    
    // 配置文件变化时重新加载
    this.registerWorkflow('config-reload', {
      condition: (event) => {
        const filename = path.basename(event.filePath);
        return ['package.json', 'requirements.txt', 'trae-team.yaml'].includes(filename);
      },
      action: (event) => {
        console.log(`重新加载配置: ${event.filePath}`);
        // 这里可以触发配置重新加载
      }
    });
    
    // 静态文件变化时刷新
    this.registerWorkflow('static-refresh', {
      condition: (event) => {
        const ext = path.extname(event.filePath);
        return ['.html', '.css', '.js', '.json', '.md'].includes(ext);
      },
      action: (event) => {
        console.log(`静态文件更新: ${event.filePath}`);
        // 这里可以触发浏览器刷新
      }
    });
  }
}

module.exports = FileWatcher;