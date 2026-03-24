const Communicator = require('../pm_agent/communicator');

class BackendTeam {
  constructor() {
    this.communicator = new Communicator();
    this.agents = {
      node: {
        name: 'NodeAgent',
        domain: 'Node.js生态',
        skills: ['Express', 'NestJS', 'Fastify', 'Bull队列', '事件驱动架构']
      },
      python: {
        name: 'PythonAgent',
        domain: 'Python后端',
        skills: ['FastAPI', 'Django', 'Celery', '异步编程', 'ML服务集成']
      },
      go: {
        name: 'GoAgent',
        domain: 'Go微服务',
        skills: ['Gin', 'Echo', 'gRPC', '高并发', '云原生开发']
      },
      rust: {
        name: 'RustAgent',
        domain: '高性能服务',
        skills: ['Actix', 'Tokio', '零成本抽象', '系统级优化']
      },
      java: {
        name: 'JavaAgent',
        domain: '企业级开发',
        skills: ['Spring Boot', 'Spring Cloud', 'JVM调优', '分布式事务']
      },
      ai: {
        name: 'AI/MLAgent',
        domain: '人工智能',
        skills: ['PyTorch/TensorFlow', '模型部署', '向量数据库', 'LLM集成']
      },
      blockchain: {
        name: 'BlockChainAgent',
        domain: '区块链',
        skills: ['Solidity', 'Rust智能合约', 'Web3.js', 'DeFi协议']
      }
    };
    this.tasks = [];
    this.completedTasks = [];

    // 注册智能体能力
    this.registerAgentCapabilities();

    // 监听来自PM Agent的任务
    this.communicator.on('task:backend', (task) => {
      this.receiveTask(task);
    });

    // 监听消息
    this.communicator.on('message:backend', (message) => {
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
        agentId: 'NodeAgent',
        languages: ['JavaScript', 'TypeScript'],
        frameworks: ['Express', 'NestJS', 'Fastify'],
        maxComplexity: 'enterprise',
        specialties: ['后端开发', 'API设计', '事件驱动']
      },
      {
        agentId: 'PythonAgent',
        languages: ['Python'],
        frameworks: ['FastAPI', 'Django', 'Celery'],
        maxComplexity: 'enterprise',
        specialties: ['后端开发', 'ML服务', '异步编程']
      },
      {
        agentId: 'GoAgent',
        languages: ['Go'],
        frameworks: ['Gin', 'Echo', 'gRPC'],
        maxComplexity: 'enterprise',
        specialties: ['微服务', '高并发', '云原生']
      },
      {
        agentId: 'RustAgent',
        languages: ['Rust'],
        frameworks: ['Actix', 'Tokio'],
        maxComplexity: 'enterprise',
        specialties: ['高性能服务', '系统级优化', '安全']
      },
      {
        agentId: 'JavaAgent',
        languages: ['Java'],
        frameworks: ['Spring Boot', 'Spring Cloud'],
        maxComplexity: 'enterprise',
        specialties: ['企业级开发', '分布式系统', 'JVM调优']
      },
      {
        agentId: 'AI/MLAgent',
        languages: ['Python', 'JavaScript'],
        frameworks: ['PyTorch', 'TensorFlow'],
        maxComplexity: 'enterprise',
        specialties: ['AI模型', '模型部署', 'LLM集成']
      },
      {
        agentId: 'BlockChainAgent',
        languages: ['Solidity', 'Rust', 'JavaScript'],
        frameworks: ['Web3.js'],
        maxComplexity: 'enterprise',
        specialties: ['智能合约', 'DeFi', '区块链开发']
      }
    ];

    capabilities.forEach(capability => {
      this.communicator.registerAgentCapability(capability);
    });
  }

  // 处理消息
  handleMessage(message) {
    console.log(`后端团队接收消息: ${message.type} - ${message.priority}`);
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
    console.log(`后端团队接收广播消息: ${message.type}`);
  }

  // 接收任务
  receiveTask(task) {
    this.tasks.push(task);
    console.log(`后端团队接收任务: ${task.id} - ${task.description}`);
    this.processTask(task);
  }

  // 处理任务
  processTask(task, autoPilot = null) {
    // 根据任务描述分配给合适的智能体
    const agent = this.selectAgent(task.description);
    console.log(`任务 ${task.id} 分配给 ${agent.name} 智能体`);

    // 如果有AutoPilot，使用它执行任务
    if (autoPilot) {
      const command = `处理后端任务: ${task.id} - ${task.description}`;
      const result = autoPilot.executeCommand(command, { task, agent });
      
      if (result.success) {
        // 任务执行成功
        setTimeout(() => {
          const progress = 100;
          this.completeTask(task.id);
          this.communicator.receiveProgressUpdate('backend', task.id, progress);
        }, 1500);
      } else {
        // 任务执行失败
        console.error(`任务执行失败: ${result.error}`);
      }
    } else {
      // 模拟任务处理过程
      setTimeout(() => {
        const progress = 100;
        this.completeTask(task.id);
        this.communicator.receiveProgressUpdate('backend', task.id, progress);
      }, 3000);
    }
  }

  // 设置AutoPilot
  setAutoPilot(autoPilot) {
    this.autoPilot = autoPilot;
    console.log('后端团队已连接到AutoPilot');
  }

  // 选择合适的智能体
  selectAgent(taskDescription) {
    const lowerTask = taskDescription.toLowerCase();
    if (lowerTask.includes('node') || lowerTask.includes('express') || lowerTask.includes('nest') || lowerTask.includes('fastify')) {
      return this.agents.node;
    } else if (lowerTask.includes('python') || lowerTask.includes('fastapi') || lowerTask.includes('django') || lowerTask.includes('ml')) {
      return this.agents.python;
    } else if (lowerTask.includes('go') || lowerTask.includes('grpc') || lowerTask.includes('微服务')) {
      return this.agents.go;
    } else if (lowerTask.includes('rust') || lowerTask.includes('actix') || lowerTask.includes('tokio')) {
      return this.agents.rust;
    } else if (lowerTask.includes('java') || lowerTask.includes('spring') || lowerTask.includes('jvm')) {
      return this.agents.java;
    } else if (lowerTask.includes('ai') || lowerTask.includes('ml') || lowerTask.includes('pytorch') || lowerTask.includes('tensorflow') || lowerTask.includes('llm')) {
      return this.agents.ai;
    } else if (lowerTask.includes('blockchain') || lowerTask.includes('solidity') || lowerTask.includes('web3') || lowerTask.includes('defi')) {
      return this.agents.blockchain;
    }
    // 默认选择NodeAgent
    return this.agents.node;
  }

  // 完成任务
  completeTask(taskId) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = this.tasks.splice(taskIndex, 1)[0];
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      this.completedTasks.push(task);
      console.log(`后端团队完成任务: ${taskId} - ${task.description}`);
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

module.exports = BackendTeam;