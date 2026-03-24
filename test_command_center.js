const CommandCenter = require('./command_center');

// 测试TRAE智能体指挥中心
async function testCommandCenter() {
  console.log('=== 测试TRAE智能体指挥中心 ===\n');
  
  // 初始化指挥中心
  console.log('1. 初始化指挥中心...');
  const commandCenter = new CommandCenter();
  
  // 测试环境信息
  console.log('\n2. 测试环境信息...');
  const envInfo = commandCenter.getEnvironmentInfo();
  console.log('环境信息:', envInfo);
  
  // 测试执行命令
  console.log('\n3. 测试执行命令...');
  const commandResult = commandCenter.executeCommand('echo "Hello TRAE!"');
  console.log('命令执行结果:', commandResult);
  
  // 测试启动完整工作流
  console.log('\n4. 测试启动完整工作流...');
  const workflowResult = commandCenter.startWorkflow('开发一个基于React的用户管理系统，使用Node.js作为后端，部署到AWS云平台');
  console.log('工作流启动结果:', workflowResult);
  
  // 测试项目状态
  console.log('\n5. 测试项目状态...');
  const projectStatus = commandCenter.getProjectStatus();
  console.log('项目状态:', projectStatus);
  
  // 测试生成项目报告
  console.log('\n6. 测试生成项目报告...');
  const report = commandCenter.generateReport();
  console.log('项目报告生成成功');
  
  // 测试安装依赖
  console.log('\n7. 测试安装依赖...');
  // const installResult = commandCenter.installDependency('lodash');
  // console.log('依赖安装结果:', installResult);
  
  // 等待一段时间让文件监控运行
  console.log('\n8. 测试文件监控...');
  console.log('文件监控状态:', commandCenter.fileWatcher.getWatchStatus());
  
  // 等待3秒后停止
  setTimeout(() => {
    console.log('\n9. 停止指挥中心...');
    commandCenter.stop();
    console.log('\n=== 测试完成 ===');
  }, 3000);
}

// 运行测试
testCommandCenter().catch(console.error);