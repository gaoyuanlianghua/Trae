const PMAgent = require('./pm_agent');
const FrontendTeam = require('./frontend');
const BackendTeam = require('./backend');
const InfraDevOpsTeam = require('./infra_devops');
const Communicator = require('./pm_agent/communicator');

// 初始化系统
const pmAgent = new PMAgent();
const frontendTeam = new FrontendTeam();
const backendTeam = new BackendTeam();
const infraTeam = new InfraDevOpsTeam();
const communicator = new Communicator();

// 连接PM Agent与通信器
pmAgent.communicator = communicator;

// 测试配置加载
console.log('\n=== 测试配置加载 ===');
console.log('团队配置:', pmAgent.configLoader.getTeamConfig());
console.log('智能体配置:', pmAgent.configLoader.getAgentsConfig());
console.log('工作流配置:', pmAgent.configLoader.getWorkflowConfig());

// 测试需求分析功能
console.log('=== 测试需求分析功能 ===');
const req1 = pmAgent.analyzeRequirements('开发一个基于React的用户管理系统');
const req2 = pmAgent.analyzeRequirements('实现用户认证和权限管理后端服务');
const req3 = pmAgent.analyzeRequirements('部署系统到云平台并配置CI/CD');

// 测试技术选型功能
console.log('\n=== 测试技术选型功能 ===');
const tech1 = pmAgent.selectTechnology('开发一个基于React的用户管理系统');
const tech2 = pmAgent.selectTechnology('实现用户认证和权限管理后端服务');

// 测试风险评估功能
console.log('\n=== 测试风险评估功能 ===');
const risk1 = pmAgent.assessRisk('开发一个基于AI的推荐系统');
const risk2 = pmAgent.assessRisk('开发一个区块链智能合约');

// 测试任务分配功能
console.log('\n=== 测试任务分配功能 ===');
const task1 = pmAgent.assignTask('使用React 18和Next.js开发用户管理界面', 'frontend', 'high');

// 测试多智能体协作编码
console.log('\n=== 测试多智能体协作编码 ===');
const collab1 = pmAgent.initiateCollaborativeCoding(task1);

// 测试质量门禁检查
console.log('\n=== 测试质量门禁检查 ===');
const quality1 = pmAgent.performQualityGates(task1);
const task2 = pmAgent.assignTask('使用Node.js和Express实现用户认证API', 'backend', 'high');
const task3 = pmAgent.assignTask('配置Docker和Kubernetes部署环境', 'infra', 'medium');

// 发送任务到各团队
communicator.sendTaskToTeam('frontend', task1);
communicator.sendTaskToTeam('backend', task2);
communicator.sendTaskToTeam('infra', task3);

// 监听进度更新
communicator.on('progress:update', (data) => {
  pmAgent.updateProgress(data.taskId, data.progress);
  console.log(`\n=== 进度更新 ===`);
  console.log(`团队: ${data.team}`);
  console.log(`任务ID: ${data.taskId}`);
  console.log(`进度: ${data.progress}%`);
  
  // 检查是否所有任务都完成
  if (pmAgent.getProjectStatus().completedTasks === 3) {
    console.log('\n=== 所有任务完成 ===');
    console.log('项目状态:', pmAgent.getProjectStatus());
    pmAgent.generateReport();
  }
});

// 定时检查项目状态
setInterval(() => {
  const status = pmAgent.getProjectStatus();
  console.log('\n=== 项目状态 ===');
  console.log(`总任务数: ${status.totalTasks}`);
  console.log(`已完成: ${status.completedTasks}`);
  console.log(`进行中: ${status.inProgressTasks}`);
  console.log(`待处理: ${status.pendingTasks}`);
  console.log(`完成率: ${status.completionRate}%`);
  
  // 广播项目状态
  communicator.broadcastProjectStatus(status);
}, 5000);

console.log('\n=== 系统初始化完成 ===');
console.log('测试正在进行中...');
