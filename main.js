#!/usr/bin/env node
/**
 * TRAE AutoPilot - 具备自我操控能力的AI开发团队
 */

const { TraeAutopilotOrchestrator } = require('./orchestrator');
const { ProjectWatcher } = require('./watcher');

function main() {
  const args = process.argv.slice(2);
  const projectPath = args.find(arg => !arg.startsWith('--'));
  const watch = args.includes('--watch') || args.includes('-w');
  const shell = args.includes('--shell') || args.includes('-s');
  
  // 初始化系统
  const orchestrator = new TraeAutopilotOrchestrator();
  const watcher = new ProjectWatcher(orchestrator);
  
  if (projectPath) {
    // 分配项目
    console.log(`\n📁 处理项目: ${projectPath}`);
    const result = orchestrator.assign_project(projectPath);
    
    console.log(`\n✅ 项目已分配: ${result.project.project_type}`);
    console.log('建议工作流:');
    result.suggested_workflow.forEach(step => {
      console.log(`  ${step}`);
    });
    
    if (watch) {
      console.log(`\n👁️ 开始监控项目: ${projectPath}`);
      watcher.watchProject(projectPath);
    }
  }
  
  if (shell || !projectPath) {
    console.log('\n🚀 启动交互式控制台');
    orchestrator.interactive_shell();
  }
  
  if (watch) {
    console.log('\n按 Ctrl+C 停止监控...');
    process.stdin.resume();
    process.stdin.on('data', () => {});
    process.stdin.on('end', () => {
      watcher.stop();
      console.log('\n👋 TRAE AutoPilot 已退出');
      process.exit(0);
    });
  } else {
    console.log('\n👋 TRAE AutoPilot 已退出');
  }
}

if (require.main === module) {
  main();
}

module.exports = main;
