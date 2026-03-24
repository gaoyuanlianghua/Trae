const Communicator = require('../pm_agent/communicator');

class FrontendTeam {
  constructor() {
    this.communicator = new Communicator();
    this.agents = {
      react: {
        name: 'ReactAgent',
        domain: 'React生态',
        skills: ['React 18', 'Next.js', 'Remix', '状态管理(Redux/Zustand/Jotai)']
      },
      vue: {
        name: 'VueAgent',
        domain: 'Vue生态',
        skills: ['Vue 3', 'Nuxt.js', 'Pinia', '组合式API']
      },
      ui: {
        name: 'UIAgent',
        domain: 'UI/UX实现',
        skills: ['TailwindCSS', 'Shadcn/ui', 'Framer Motion', '响应式设计']
      },
      type: {
        name: 'TypeAgent',
        domain: '类型系统',
        skills: ['TypeScript高级类型', '类型体操', '类型安全架构']
      },
      mobile: {
        name: 'MobileAgent',
        domain: '移动开发',
        skills: ['React Native', 'Flutter', 'Swift', 'Kotlin', '原生模块开发']
      },
      game: {
        name: 'GameAgent',
        domain: '游戏开发',
        skills: ['Unity', 'Unreal', '游戏物理', '网络同步', '性能优化']
      }
    };
    this.tasks = [];
    this.completedTasks = [];

    // 注册智能体能力
    this.registerAgentCapabilities();

    // 监听来自PM Agent的任务
    this.communicator.on('task:frontend', (task) => {
      this.receiveTask(task);
    });

    // 监听消息
    this.communicator.on('message:frontend', (message) => {
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
        agentId: 'ReactAgent',
        languages: ['JavaScript', 'TypeScript'],
        frameworks: ['React', 'Next.js', 'Remix'],
        maxComplexity: 'enterprise',
        specialties: ['前端开发', '状态管理', 'SSR']
      },
      {
        agentId: 'VueAgent',
        languages: ['JavaScript', 'TypeScript'],
        frameworks: ['Vue', 'Nuxt.js'],
        maxComplexity: 'enterprise',
        specialties: ['前端开发', '状态管理', 'SSR']
      },
      {
        agentId: 'UIAgent',
        languages: ['HTML', 'CSS', 'JavaScript'],
        frameworks: ['TailwindCSS', 'Shadcn/ui', 'Framer Motion'],
        maxComplexity: 'medium',
        specialties: ['UI/UX设计', '响应式设计', '动画效果']
      },
      {
        agentId: 'TypeAgent',
        languages: ['TypeScript'],
        frameworks: ['TypeScript'],
        maxComplexity: 'complex',
        specialties: ['类型系统', '类型安全', '代码质量']
      },
      {
        agentId: 'MobileAgent',
        languages: ['JavaScript', 'TypeScript', 'Swift', 'Kotlin'],
        frameworks: ['React Native', 'Flutter'],
        maxComplexity: 'enterprise',
        specialties: ['移动开发', '跨平台', '原生模块']
      },
      {
        agentId: 'GameAgent',
        languages: ['C#', 'C++', 'JavaScript'],
        frameworks: ['Unity', 'Unreal'],
        maxComplexity: 'enterprise',
        specialties: ['游戏开发', '物理引擎', '网络同步']
      }
    ];

    capabilities.forEach(capability => {
      this.communicator.registerAgentCapability(capability);
    });
  }

  // 处理消息
  handleMessage(message) {
    console.log(`前端团队接收消息: ${message.type} - ${message.priority}`);
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
    console.log(`前端团队接收广播消息: ${message.type}`);
  }

  // 接收任务
  receiveTask(task) {
    this.tasks.push(task);
    console.log(`前端团队接收任务: ${task.id} - ${task.description}`);
    this.processTask(task);
  }

  // 处理任务
  processTask(task, autoPilot = null) {
    // 根据任务描述分配给合适的智能体
    const agent = this.selectAgent(task.description);
    console.log(`任务 ${task.id} 分配给 ${agent.name} 智能体`);

    // 如果有AutoPilot，使用它执行任务
    if (autoPilot) {
      const command = `处理前端任务: ${task.id} - ${task.description}`;
      const result = autoPilot.executeCommand(command, { task, agent });
      
      if (result.success) {
        // 任务执行成功
        setTimeout(() => {
          const progress = 100;
          this.completeTask(task.id);
          this.communicator.receiveProgressUpdate('frontend', task.id, progress);
        }, 1000);
      } else {
        // 任务执行失败
        console.error(`任务执行失败: ${result.error}`);
      }
    } else {
      // 模拟任务处理过程
      setTimeout(() => {
        const progress = 100;
        this.completeTask(task.id);
        this.communicator.receiveProgressUpdate('frontend', task.id, progress);
      }, 2000);
    }
  }

  // 设置AutoPilot
  setAutoPilot(autoPilot) {
    this.autoPilot = autoPilot;
    console.log('前端团队已连接到AutoPilot');
  }

  // 选择合适的智能体
  selectAgent(taskDescription) {
    const lowerTask = taskDescription.toLowerCase();
    if (lowerTask.includes('react') || lowerTask.includes('next') || lowerTask.includes('remix')) {
      return this.agents.react;
    } else if (lowerTask.includes('vue') || lowerTask.includes('nuxt')) {
      return this.agents.vue;
    } else if (lowerTask.includes('ui') || lowerTask.includes('ux') || lowerTask.includes('design')) {
      return this.agents.ui;
    } else if (lowerTask.includes('typescript') || lowerTask.includes('type')) {
      return this.agents.type;
    } else if (lowerTask.includes('mobile') || lowerTask.includes('react native') || lowerTask.includes('flutter') || lowerTask.includes('swift') || lowerTask.includes('kotlin')) {
      return this.agents.mobile;
    } else if (lowerTask.includes('game') || lowerTask.includes('unity') || lowerTask.includes('unreal')) {
      return this.agents.game;
    }
    // 默认选择ReactAgent
    return this.agents.react;
  }

  // 完成任务
  completeTask(taskId) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = this.tasks.splice(taskIndex, 1)[0];
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      this.completedTasks.push(task);
      console.log(`前端团队完成任务: ${taskId} - ${task.description}`);
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

module.exports = FrontendTeam;