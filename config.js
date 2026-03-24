const fs = require('fs');
const path = require('path');

class ConfigLoader {
  constructor() {
    this.configPath = path.join(__dirname, 'trae-team.yaml');
    this.config = null;
  }

  // 加载配置
  loadConfig() {
    try {
      const yamlContent = fs.readFileSync(this.configPath, 'utf8');
      this.config = this.parseYAML(yamlContent);
      console.log('配置加载完成:', this.config.team.name, 'v' + this.config.team.version);
      return this.config;
    } catch (error) {
      console.error('配置加载失败:', error.message);
      return null;
    }
  }

  // 解析YAML
  parseYAML(yamlContent) {
    // 简单的YAML解析器
    const lines = yamlContent.trim().split('\n');
    const config = {};
    let currentObj = config;
    const stack = [];

    lines.forEach(line => {
      line = line.trim();
      if (line === '' || line.startsWith('#')) return;

      const indent = line.match(/^\s*/)[0].length;
      const keyValue = line.replace(/^\s*/, '');

      if (keyValue.endsWith(':')) {
        const key = keyValue.slice(0, -1);
        const newObj = Array.isArray(currentObj) ? {} : [];
        
        if (Array.isArray(currentObj)) {
          currentObj.push(newObj);
          stack.push({ obj: currentObj, index: currentObj.length - 1 });
          currentObj = newObj;
        } else {
          currentObj[key] = Array.isArray(newObj) ? [] : {};
          stack.push({ obj: currentObj, key: key });
          currentObj = currentObj[key];
        }
      } else if (keyValue.includes(':')) {
        const [key, value] = keyValue.split(':', 2).map(item => item.trim());
        const parsedValue = this.parseValue(value);
        
        if (Array.isArray(currentObj)) {
          const lastObj = currentObj[currentObj.length - 1];
          lastObj[key] = parsedValue;
        } else {
          currentObj[key] = parsedValue;
        }
      }
    });

    return config;
  }

  // 解析值
  parseValue(value) {
    value = value.trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    } else if (value === 'true') {
      return true;
    } else if (value === 'false') {
      return false;
    } else if (!isNaN(value) && value !== '') {
      return Number(value);
    }
    return value;
  }

  // 获取团队配置
  getTeamConfig() {
    return this.config?.team || null;
  }

  // 获取智能体配置
  getAgentsConfig() {
    return this.config?.agents || [];
  }

  // 获取工作流配置
  getWorkflowConfig() {
    return this.config?.workflow || {
      code_review_required: false,
      auto_test_threshold: 70,
      security_scan: false
    };
  }

  // 获取特定智能体配置
  getAgentConfig(agentId) {
    return this.config?.agents?.find(agent => agent.id === agentId) || null;
  }
}

module.exports = ConfigLoader;