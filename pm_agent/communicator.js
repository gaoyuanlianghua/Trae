const { AgentMessage, AgentCapability } = require('../types');

class Communicator {
  constructor() {
    this.events = {};
    this.agentCapabilities = {};
  }

  // 注册事件监听器
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  // 触发事件
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件处理错误 (${event}):`, error);
        }
      });
    }
  }

  // 移除事件监听器
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  // 注册智能体能力
  registerAgentCapability(capability) {
    this.agentCapabilities[capability.agentId] = capability;
    console.log(`智能体能力注册完成: ${capability.agentId}`);
  }

  // 获取智能体能力
  getAgentCapability(agentId) {
    return this.agentCapabilities[agentId];
  }

  // 发送消息
  sendMessage(message) {
    // 验证消息格式
    this.validateMessage(message);
    
    if (message.to === 'broadcast') {
      this.emit('message:broadcast', message);
      console.log(`广播消息: ${message.type} - ${message.priority}`);
    } else {
      this.emit(`message:${message.to}`, message);
      console.log(`发送消息到 ${message.to}: ${message.type} - ${message.priority}`);
    }
  }

  // 验证消息格式
  validateMessage(message) {
    const requiredFields = ['from', 'to', 'type', 'payload', 'priority'];
    requiredFields.forEach(field => {
      if (!message[field]) {
        throw new Error(`消息缺少必需字段: ${field}`);
      }
    });
    
    const validTypes = ['task', 'review', 'question', 'suggestion', 'alert'];
    if (!validTypes.includes(message.type)) {
      throw new Error(`无效的消息类型: ${message.type}`);
    }
    
    if (message.priority < 1 || message.priority > 5) {
      throw new Error(`无效的优先级: ${message.priority}`);
    }
  }

  // 发送任务到团队
  sendTaskToTeam(team, task) {
    const message = {
      from: 'pm_agent',
      to: team,
      type: 'task',
      payload: {
        context: {
          projectId: 'default',
          projectName: '默认项目',
          currentPhase: '开发',
          dependencies: [],
          timeline: {}
        },
        requirements: [task.description]
      },
      priority: task.priority === 'high' ? 5 : task.priority === 'medium' ? 3 : 1
    };
    
    this.sendMessage(message);
    this.emit(`task:${team}`, task);
    console.log(`任务已发送到 ${team} 团队: ${task.id} - ${task.description}`);
  }

  // 接收团队进度更新
  receiveProgressUpdate(team, taskId, progress) {
    this.emit('progress:update', { team, taskId, progress });
    console.log(`${team} 团队更新任务进度: ${taskId} - ${progress}%`);
  }

  // 发送项目状态到所有团队
  broadcastProjectStatus(status) {
    const message = {
      from: 'pm_agent',
      to: 'broadcast',
      type: 'alert',
      payload: {
        context: {
          projectId: 'default',
          projectName: '默认项目',
          currentPhase: '开发',
          dependencies: [],
          timeline: {}
        },
        requirements: [JSON.stringify(status)]
      },
      priority: 3
    };
    
    this.sendMessage(message);
    this.emit('project:status', status);
    console.log('项目状态已广播到所有团队');
  }
}

module.exports = Communicator;