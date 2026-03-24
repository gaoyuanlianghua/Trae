const Communicator = require('../pm_agent/communicator');

class InfraDevOpsTeam {
  constructor() {
    this.communicator = new Communicator();
    this.agents = {
      db: {
        name: 'DBAgent',
        domain: '数据库专家',
        skills: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', '分库分表', '查询优化']
      },
      devops: {
        name: 'DevOpsAgent',
        domain: '运维部署',
        skills: ['Docker', 'Kubernetes', 'Terraform', 'CI/CD', '监控告警']
      },
      cloud: {
        name: 'CloudAgent',
        domain: '云服务',
        skills: ['AWS/Azure/GCP', 'Serverless', '成本优化', '多区域架构']
      },
      security: {
        name: 'SecurityAgent',
        domain: '安全专家',
        skills: ['漏洞扫描', '安全编码', '加密方案', '合规审计']
      },
      embedded: {
        name: 'EmbeddedAgent',
        domain: '嵌入式',
        skills: ['C/C++', 'RTOS', '物联网', '硬件交互', '低功耗优化']
      }
    };
    this.tasks = [];
    this.completedTasks = [];

    // 注册智能体能力
    this.registerAgentCapabilities();

    // 监听来自PM Agent的任务
    this.communicator.on('task:infra', (task) => {
      this.receiveTask(task);
    });

    // 监听消息
    this.communicator.on('message:infra', (message) => {
      this.handleMessage(message);
    });

    // 监听广播消息
    this.communicator.on('message:broadcast', (message) => {
      this.handleBroadcastMessage(message);
    });
  }

  // 注册智能体能力
  registerAgentCapabilities() {
    const capabilities = [
      {
        agentId: 'DBAgent',
        languages: ['SQL', 'NoSQL'],
        frameworks: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis'],
        maxComplexity: 'enterprise',
        specialties: ['数据库设计', '查询优化', '分库分表']
      },
      {
        agentId: 'DevOpsAgent',
        languages: ['Shell', 'Python', 'YAML'],
        frameworks: ['Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
        maxComplexity: 'enterprise',
        specialties: ['运维部署', '监控告警', '自动化']
      },
      {
        agentId: 'CloudAgent',
        languages: ['Python', 'Terraform', 'CloudFormation'],
        frameworks: ['AWS', 'Azure', 'GCP', 'Serverless'],
        maxComplexity: 'enterprise',
        specialties: ['云服务', '成本优化', '多区域架构']
      },
      {
        agentId: 'SecurityAgent',
        languages: ['Python', 'Shell', 'OWASP'],
        frameworks: ['漏洞扫描工具', '安全测试框架'],
        maxComplexity: 'enterprise',
        specialties: ['安全审计', '漏洞扫描', '加密方案']
      },
      {
        agentId: 'EmbeddedAgent',
        languages: ['C', 'C++', 'Rust'],
        frameworks: ['RTOS', 'IoT frameworks'],
        maxComplexity: 'enterprise',
        specialties: ['嵌入式开发', '物联网', '低功耗优化']
      }
    ];

    capabilities.forEach(capability => {
      this.communicator.registerAgentCapability(capability);
    });
  }

  // 处理消息
  handleMessage(message) {
    console.log(`基础架构团队接收消息: ${message.type} - ${message.priority}`);
    switch (message.type) {
      case 'task':
        // 处理任务消息
        break;
      case 'review':
        // 处理代码评审消息
        break;
      case 'question':
        // 处理问题消息
        break;
      case 'suggestion':
        // 处理建议消息
        break;
      case 'alert':
        // 处理告警消息
        break;
    }
  }

  // 处理广播消息
  handleBroadcastMessage(message) {
    console.log(`基础架构团队接收广播消息: ${message.type}`);
  }

  // 接收任务
  receiveTask(task) {
    this.tasks.push(task);
    console.log(`基础架构团队接收任务: ${task.id} - ${task.description}`);
    this.processTask(task);
  }

  // 处理任务
  processTask(task, autoPilot = null) {
    // 根据任务描述分配给合适的智能体
    const agent = this.selectAgent(task.description);
    console.log(`任务 ${task.id} 分配给 ${agent.name} 智能体`);

    // 如果有AutoPilot，使用它执行任务
    if (autoPilot) {
      const command = `处理基础架构任务: ${task.id} - ${task.description}`;
      const result = autoPilot.executeCommand(command, { task, agent });
      
      if (result.success) {
        // 任务执行成功
        setTimeout(() => {
          const progress = 100;
          this.completeTask(task.id);
          this.communicator.receiveProgressUpdate('infra', task.id, progress);
        }, 1200);
      } else {
        // 任务执行失败
        console.error(`任务执行失败: ${result.error}`);
      }
    } else {
      // 模拟任务处理过程
      setTimeout(() => {
        const progress = 100;
        this.completeTask(task.id);
        this.communicator.receiveProgressUpdate('infra', task.id, progress);
      }, 2500);
    }
  }

  // 设置AutoPilot
  setAutoPilot(autoPilot) {
    this.autoPilot = autoPilot;
    console.log('基础架构团队已连接到AutoPilot');
  }

  // 选择合适的智能体
  selectAgent(taskDescription) {
    const lowerTask = taskDescription.toLowerCase();
    if (lowerTask.includes('数据库') || lowerTask.includes('db') || lowerTask.includes('postgresql') || lowerTask.includes('mysql') || lowerTask.includes('mongodb') || lowerTask.includes('redis')) {
      return this.agents.db;
    } else if (lowerTask.includes('devops') || lowerTask.includes('docker') || lowerTask.includes('kubernetes') || lowerTask.includes('ci/cd') || lowerTask.includes('监控')) {
      return this.agents.devops;
    } else if (lowerTask.includes('云') || lowerTask.includes('cloud') || lowerTask.includes('aws') || lowerTask.includes('azure') || lowerTask.includes('gcp') || lowerTask.includes('serverless')) {
      return this.agents.cloud;
    } else if (lowerTask.includes('安全') || lowerTask.includes('security') || lowerTask.includes('漏洞') || lowerTask.includes('加密') || lowerTask.includes('合规')) {
      return this.agents.security;
    } else if (lowerTask.includes('embedded') || lowerTask.includes('嵌入式') || lowerTask.includes('c/c++') || lowerTask.includes('rtos') || lowerTask.includes('物联网') || lowerTask.includes('硬件')) {
      return this.agents.embedded;
    }
    // 默认选择DevOpsAgent
    return this.agents.devops;
  }

  // 完成任务
  completeTask(taskId) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = this.tasks.splice(taskIndex, 1)[0];
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      this.completedTasks.push(task);
      console.log(`基础架构团队完成任务: ${taskId} - ${task.description}`);
      return true;
    }
    return false;
  }

  // 获取团队状态
  getTeamStatus() {
    return {
      totalTasks: this.tasks.length + this.completedTasks.length,
      pendingTasks: this.tasks.length,
      completedTasks: this.completedTasks.length,
      completionRate: this.tasks.length + this.completedTasks.length > 0 
        ? (this.completedTasks.length / (this.tasks.length + this.completedTasks.length) * 100).toFixed(2)
        : 0,
      availableAgents: Object.keys(this.agents).length
    };
  }

  // 获取可用的智能体
  getAvailableAgents() {
    return this.agents;
  }
}

module.exports = InfraDevOpsTeam;