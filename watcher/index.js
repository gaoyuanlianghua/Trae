const fs = require('fs');
const path = require('path');

class TraeAutoTriggerHandler {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.pendingChanges = new Set();
    this.lastBatchTime = 0;
    this.debounceTimeout = null;
  }

  handleFileChange(filePath) {
    // 忽略特定文件
    const ignorePatterns = ['.git', 'node_modules', '__pycache__', '.pytest_cache',
                          '.mypy_cache', '.next', 'dist', 'build'];
    
    if (ignorePatterns.some(pattern => filePath.includes(pattern))) {
      return;
    }

    this.pendingChanges.add(filePath);

    // 批量处理 (100ms防抖)
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      const changes = Array.from(this.pendingChanges);
      this.pendingChanges.clear();
      
      // 提交给编排器处理
      this.orchestrator.handle_file_changes(changes);
    }, 100);
  }
}

class ProjectWatcher {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.watchers = {};
  }

  watchProject(projectPath) {
    const absolutePath = path.resolve(projectPath);
    
    if (this.watchers[absolutePath]) {
      console.log(`项目 ${absolutePath} 已经在监控中`);
      return;
    }

    const handler = new TraeAutoTriggerHandler(this.orchestrator);
    
    try {
      const watcher = fs.watch(absolutePath, { recursive: true }, (eventType, filename) => {
        if (filename) {
          const filePath = path.join(absolutePath, filename);
          handler.handleFileChange(filePath);
        }
      });

      this.watchers[absolutePath] = watcher;
      console.log(`👁️ 开始监控: ${absolutePath}`);
    } catch (error) {
      console.error(`监控项目失败 ${absolutePath}:`, error.message);
    }
  }

  unwatch(projectPath) {
    const absolutePath = path.resolve(projectPath);
    
    if (this.watchers[absolutePath]) {
      this.watchers[absolutePath].close();
      delete this.watchers[absolutePath];
      console.log(`停止监控: ${absolutePath}`);
    }
  }

  stop() {
    Object.values(this.watchers).forEach(watcher => {
      watcher.close();
    });
    this.watchers = {};
    console.log('所有监控已停止');
  }

  getWatchedProjects() {
    return Object.keys(this.watchers);
  }
}

module.exports = {
  TraeAutoTriggerHandler,
  ProjectWatcher
};
