const PMAgent = require('../pm_agent');
const { TraeAutopilotOrchestrator } = require('../orchestrator');
const EnvironmentAgent = require('../environment_agent');
const FrontendTeam = require('../frontend');
const BackendTeam = require('../backend');
const InfraDevOpsTeam = require('../infra_devops');

class CommandCenter {
  constructor() {
    // 初始化各模块
    this.pmAgent = new PMAgent();
    this.orchestrator = new TraeAutopilotOrchestrator();
    this.environmentAgent = new EnvironmentAgent();
    this.frontendTeam = new FrontendTeam();
    this.backendTeam = new BackendTeam();
    this.infraTeam = new InfraDevOpsTeam();
    
    // 初始化通信机制
    this.initializeCommunication();
    
    // 扫描项目依赖
    this.scanProject();
    
    console.log('TRAE 智能体指挥中心初始化完成');
  }

  // 初始化通信机制
  initializeCommunication() {
    console.log('初始化模块间通信...');
    
    // 代码智能体与Orchestrator的通信
    this.frontendTeam.communicator.on('task:frontend', (task) => {
      const taskRequest = {
        task_id: task.id,
        description: task.description,
        project_path: '.',
        file_changes: [],
        priority: 3,
        required_specialties: ['react']
      };
      this.orchestrator.process_task_request(taskRequest);
    });
    
    this.backendTeam.communicator.on('task:backend', (task) => {
      const taskRequest = {
        task_id: task.id,
        description: task.description,
        project_path: '.',
        file_changes: [],
        priority: 3,
        required_specialties: ['nodejs']
      };
      this.orchestrator.process_task_request(taskRequest);
    });
    
    this.infraTeam.communicator.on('task:infra', (task) => {
      const taskRequest = {
        task_id: task.id,
        description: task.description,
        project_path: '.',
        file_changes: [],
        priority: 3,
        required_specialties: ['devops']
      };
      this.orchestrator.process_task_request(taskRequest);
    });
    
    // AutoPilot与环境智能体的通信
    // 由于AutoPilot没有事件系统，我们直接在executeCommand后检查
    
    // 环境智能体与其他模块的通信
    // 由于EnvironmentAgent没有事件系统，我们直接调用方法
    

    
    console.log('模块间通信初始化完成');
  }



  // 分配任务
  assignTask(taskDescription, team, priority = 'medium') {
    const task = this.pmAgent.assignTask(taskDescription, team, priority);
    
    // 通过AutoPilot执行任务
    this.autoPilot.executeCommand(`执行任务: ${task.id} - ${task.description}`, { task });
    
    return task;
  }

  // 分析需求
  analyzeRequirements(requirementDescription) {
    return this.pmAgent.analyzeRequirements(requirementDescription);
  }

  // 执行命令
  executeCommand(command, context = {}) {
    // 使用DevOps智能体执行通用命令
    const devopsAgent = this.orchestrator.agents['devops-001'];
    return devopsAgent.executeCommand(command, context);
  }

  // 安装依赖
  installDependency(packageName, options = {}) {
    return this.environmentAgent.installDependency(packageName, options);
  }

  // 获取环境信息
  getEnvironmentInfo() {
    return this.environmentAgent.getEnvironmentInfo();
  }

  // 获取项目状态
  getProjectStatus() {
    return this.pmAgent.getProjectStatus();
  }

  // 生成项目报告
  generateReport() {
    return this.pmAgent.generateReport();
  }

  // 启动完整工作流
  startWorkflow(requirements) {
    console.log('启动完整工作流...');
    
    // 分析需求
    const req = this.analyzeRequirements(requirements);
    
    // 技术选型
    const techStack = this.pmAgent.selectTechnology(requirements);
    
    // 风险评估
    const risks = this.pmAgent.assessRisk(requirements);
    
    // 分配任务
    const tasks = [];
    if (techStack.frontend.length > 0) {
      tasks.push(this.assignTask('开发前端界面', 'frontend', 'high'));
    }
    if (techStack.backend.length > 0) {
      tasks.push(this.assignTask('开发后端API', 'backend', 'high'));
    }
    if (techStack.infra.length > 0) {
      tasks.push(this.assignTask('配置部署环境', 'infra', 'medium'));
    }
    
    // 执行质量门禁检查
    tasks.forEach(task => {
      this.pmAgent.performQualityGates(task);
    });
    
    console.log('工作流启动完成');
    return { req, techStack, risks, tasks };
  }

  // 扫描项目依赖
  scanProject(projectPath = '.') {
    console.log('扫描项目依赖...');
    return this.orchestrator.assign_project(projectPath);
  }
  
  // 预测下一步命令
  predictCommands(recentContext = null) {
    // 使用DevOps智能体预测命令
    const devopsAgent = this.orchestrator.agents['devops-001'];
    return devopsAgent.predict(recentContext);
  }
  
  // 学习命令序列
  learnCommandSequence(name, commands, context = {}) {
    // 使用DevOps智能体学习命令序列
    const devopsAgent = this.orchestrator.agents['devops-001'];
    return devopsAgent.learn(name, commands, context);
  }
  
  // 执行学习的命令序列
  runCommandSequence(name, envVars = {}) {
    // 使用DevOps智能体执行命令序列
    const devopsAgent = this.orchestrator.agents['devops-001'];
    return devopsAgent.run(name, envVars);
  }
  

  
  // 处理任务请求
  processTaskRequest(taskRequest) {
    return this.orchestrator.process_task_request(taskRequest);
  }
  
  // 获取智能体状态
  getAgentStatus() {
    return this.orchestrator.get_agent_status();
  }
  
  // 处理文件变化
  handleFileChanges(changes) {
    return this.orchestrator.handle_file_changes(changes);
  }
  
  // 执行复杂任务
  executeTask(task) {
    return this.orchestrator.execute_task(task);
  }
  
  // 启动交互式控制台
  startInteractiveShell() {
    this.orchestrator.interactive_shell();
  }
  
  // 显示系统状态
  showStatus() {
    this.orchestrator._show_status();
  }
  
  // 停止所有服务
  stop() {
    console.log('停止指挥中心...');
    
    // 停止文件监控
    this.orchestrator.stop_all_watching();
    
    console.log('指挥中心已停止');
  }
}

module.exports = CommandCenter;