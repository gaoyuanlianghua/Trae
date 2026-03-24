const AutoPilot = require('../autopilot');
const { ProjectWatcher } = require('../watcher');

class TraeAgentWithAutopilot extends AutoPilot {
  constructor(agent_id, specialty, model) {
    super();
    this.agent_id = agent_id;
    this.specialty = specialty;
    this.model = model;
    console.log(`🚨 智能体 ${agent_id} (${specialty}) 已初始化`);
  }
}

class TraeAutopilotOrchestrator {
  constructor() {
    this.agents = {};
    this.active_project = null;
    this.watcher = new ProjectWatcher(this);
    this._init_core_team();
  }

  _init_core_team() {
    const team_config = [
      ['pm-001', 'project_manager', 'claude-3-opus'],
      ['fe-react-001', 'react', 'claude-3.5-sonnet'],
      ['fe-vue-001', 'vue', 'claude-3.5-sonnet'],
      ['be-node-001', 'nodejs', 'claude-3.5-sonnet'],
      ['be-python-001', 'python', 'claude-3.5-sonnet'],
      ['be-go-001', 'go', 'claude-3.5-sonnet'],
      ['db-001', 'database', 'claude-3.5-sonnet'],
      ['devops-001', 'devops', 'claude-3-haiku'],
    ];

    for (const [agent_id, specialty, model] of team_config) {
      this.agents[agent_id] = new TraeAgentWithAutopilot(agent_id, specialty, model);
    }

    console.log(`🚀 TRAE AutoPilot 团队已就绪: ${Object.keys(this.agents).length} 名智能体`);
  }

  assign_project(project_path) {
    const pm = this.agents['pm-001'];
    const profile = pm.scan(project_path);

    this.active_project = project_path;

    // 开始监控项目
    this.watcher.watchProject(project_path);

    const activated = [];

    const specialty_map = {
      'react': 'fe-react-001',
      'vue': 'fe-vue-001',
      'nodejs': 'be-node-001',
      'python': 'be-python-001',
      'go': 'be-go-001',
    };

    if (profile.project_type in specialty_map) {
      const agent_id = specialty_map[profile.project_type];
      const agent = this.agents[agent_id];

      this._bootstrap_agent(agent, profile);
      activated.push(agent_id);
    }

    this.agents['devops-001'].scan(project_path);
    activated.push('devops-001');

    return {
      project: profile,
      activated_agents: activated,
      suggested_workflow: this._suggest_workflow(profile),
      watched_project: project_path
    };
  }

  _bootstrap_agent(agent, profile) {
    // 学习安装命令
    for (let i = 0; i < profile.install_commands.length; i++) {
      const cmd = profile.install_commands[i];
      agent.learn(`install_${i}`, [cmd], { type: 'bootstrap', phase: 'setup' });
    }

    // 学习测试命令
    for (let i = 0; i < profile.test_commands.length; i++) {
      const cmd = profile.test_commands[i];
      agent.learn(`test_${i}`, [cmd], { type: 'quality', phase: 'verify' });
    }

    // 学习代码检查命令
    for (let i = 0; i < profile.lint_commands.length; i++) {
      const cmd = profile.lint_commands[i];
      agent.learn(`lint_${i}`, [cmd], { type: 'quality', phase: 'check' });
    }
  }

  handle_file_changes(changes) {
    if (!this.active_project) {
      return [{ error: 'No active project' }];
    }

    const results = [];

    // 按文件类型分组
    const by_type = {};
    for (const change of changes) {
      const ext = require('path').extname(change);
      if (!by_type[ext]) {
        by_type[ext] = [];
      }
      by_type[ext].push(change);
    }

    // 处理不同类型
    for (const [ext, files] of Object.entries(by_type)) {
      const agent = this._select_agent_for_extension(ext);
      if (agent) {
        try {
          const result = this._process_file_batch(agent, files, ext);
          results.push({
            agent: agent.agent_id,
            files: files,
            result: result
          });
        } catch (error) {
          results.push({
            agent: agent.agent_id,
            files: files,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  _select_agent_for_extension(ext) {
    const ext_map = {
      '.tsx': 'fe-react-001',
      '.jsx': 'fe-react-001',
      '.vue': 'fe-vue-001',
      '.ts': 'fe-react-001',  // 优先React组处理TS
      '.js': 'be-node-001',
      '.py': 'be-python-001',
      '.go': 'be-go-001',
      '.rs': null,  // 需要添加Rust智能体
      '.sql': 'db-001',
      '.yaml': 'devops-001',
      '.yml': 'devops-001',
      '.tf': 'devops-001',
    };

    const agent_id = ext_map[ext];
    return agent_id ? this.agents[agent_id] : null;
  }

  _process_file_batch(agent, files, ext) {
    // 防抖：合并处理
    for (const f of files) {
      agent.on_file_change(f, 300);
    }

    // 预测并执行下一步
    const predictions = agent.predict();

    const executed = [];
    for (const pred of predictions.slice(0, 2)) {  // 执行前2个预测
      for (const cmd of pred.commands) {
        // 执行实际命令
        const result = agent._exec(cmd);
        executed.push({
          command: cmd,
          success: result.returncode === 0,
          predicted_confidence: pred.confidence
        });
      }
    }

    return {
      predictions: predictions,
      executed: executed
    };
  }

  execute_task(task) {
    // PM智能体拆解任务
    const pm = this.agents['pm-001'];

    // 为每个所需专长分配智能体
    const assigned = [];
    for (const specialty of task.required_specialties) {
      const agent = this._get_agent_by_specialty(specialty);
      if (agent) {
        assigned.push(agent);
      }
    }

    // 执行任务
    const results = [];
    for (const agent of assigned) {
      try {
        const result = this._run_agent_task(agent, task);
        results.push({ agent: agent.agent_id, result: result });
      } catch (error) {
        results.push({ agent: agent.agent_id, error: error.message });
      }
    }

    // 汇总结果
    return {
      task_id: task.task_id,
      sub_results: results,
      summary: this._summarize_results(results)
    };
  }

  _get_agent_by_specialty(specialty) {
    for (const agent of Object.values(this.agents)) {
      if (agent.specialty === specialty) {
        return agent;
      }
    }
    return null;
  }

  _run_agent_task(agent, task) {
    // 运行单个智能体任务
    agent.scan(task.project_path);

    // 智能体自主决策执行哪些命令
    const predictions = agent.predict(task.file_changes);

    const executed = [];
    for (const pred of predictions) {
      if (pred.confidence > 0.7) {
        for (const cmd of pred.commands) {
          let result;
          // 检查命令是否在记忆中
          const cmdKey = `${agent.specialty}:${cmd}`;
          if (agent.memory.commands[cmdKey]) {
            result = agent.run(cmd);
          } else {
            result = agent._exec(cmd);
          }
          executed.push({
            command: cmd,
            success: result.returncode === 0
          });
        }
      }
    }

    return {
      predictions: predictions,
      executed: executed
    };
  }

  _suggest_workflow(profile) {
    const workflows = {
      'react': [
        '1. npm install (安装依赖)',
        '2. npm run dev (启动开发服务器)',
        '3. 文件修改自动触发类型检查',
        '4. git commit 前自动运行 lint + test',
        '5. npm run build (生产构建)'
      ],
      'python': [
        '1. pip install -r requirements.txt',
        '2. pytest (运行测试)',
        '3. 文件修改自动运行 flake8',
        '4. mypy . (类型检查)',
        '5. docker build (容器化)'
      ],
      'nodejs': [
        '1. npm install (安装依赖)',
        '2. npm run dev (启动开发服务器)',
        '3. 文件修改自动触发 lint',
        '4. git commit 前自动运行 test',
        '5. npm run build (生产构建)'
      ],
      'go': [
        '1. go mod tidy (整理依赖)',
        '2. go run main.go (运行程序)',
        '3. 文件修改自动运行 go fmt',
        '4. git commit 前自动运行 go test',
        '5. go build (编译)' 
      ]
    };

    return workflows[profile.project_type] || ['自定义工作流'];
  }

  _summarize_results(results) {
    const success = results.filter(r => !r.error).length;
    const total = results.length;
    return `${success}/${total} 智能体成功完成任务`;
  }

  interactive_shell() {
    console.log("\n" + "=".repeat(50));
    console.log("  TRAE AutoPilot 交互式控制台");
    console.log("=".repeat(50));
    console.log("命令: learn <name> 'cmd1; cmd2' | run <name> | scan <path>");
    console.log("      predict | exec <cmd> | status | save | quit");
    console.log("-".repeat(50));

    // 这里仅作为方法定义，实际交互需要在命令行环境中运行
    console.log("交互式控制台已启动 (在实际环境中使用)");
  }

  _get_active_agent() {
    // 默认返回第一个激活的后端智能体，或PM
    for (const agent of Object.values(this.agents)) {
      if (agent.current_project) {
        return agent;
      }
    }
    return this.agents['pm-001'];
  }

  _show_status() {
    console.log("\n--- 系统状态 ---");
    console.log(`活跃项目: ${this.active_project || '无'}`);
    console.log(`智能体数量: ${Object.keys(this.agents).length}`);
    console.log(`监控项目: ${this.watcher.getWatchedProjects().length}`);

    for (const agent of Object.values(this.agents)) {
      const status = agent.current_project ? "🟢 活跃" : "⚪ 待机";
      const mem_count = Object.keys(agent.memory.commands).length;
      console.log(`  ${agent.agent_id} (${agent.specialty}): ${status} | 记忆: ${mem_count}条`);
    }

    if (this.watcher.getWatchedProjects().length > 0) {
      console.log("\n--- 监控项目 ---");
      this.watcher.getWatchedProjects().forEach(project => {
        console.log(`  📁 ${project}`);
      });
    }
  }

  stop_watching(project_path) {
    this.watcher.unwatch(project_path);
  }

  stop_all_watching() {
    this.watcher.stop();
  }

  get_watched_projects() {
    return this.watcher.getWatchedProjects();
  }

  process_task_request(task_request) {
    const { task_id, description, project_path, priority, required_specialties } = task_request;

    console.log(`📋 处理任务请求: ${task_id} - ${description}`);

    const suitable_agents = [];

    for (const [agent_id, agent] of Object.entries(this.agents)) {
      if (required_specialties.includes(agent.specialty)) {
        suitable_agents.push(agent);
      }
    }

    if (suitable_agents.length === 0) {
      console.log('❌ 没有找到合适的智能体');
      return { task_id, status: 'failed', message: 'No suitable agent found' };
    }

    const agent = suitable_agents[0];
    console.log(`👤 分配任务给智能体: ${agent.agent_id} (${agent.specialty})`);

    agent.scan(project_path);

    const commands = this._generate_commands_for_task(description, agent.specialty);

    if (commands.length > 0) {
      const cmd_hash = agent.learn(`task_${task_id}`, commands, { task: description });
      const result = agent.run(`task_${task_id}`);

      return {
        task_id,
        status: result.returncode === 0 ? 'completed' : 'failed',
        agent_id: agent.agent_id,
        result: result
      };
    } else {
      return {
        task_id,
        status: 'failed',
        message: 'Could not generate commands for task'
      };
    }
  }

  _generate_commands_for_task(description, specialty) {
    const commands = [];

    const lower_desc = description.toLowerCase();

    if (lower_desc.includes('安装') || lower_desc.includes('依赖')) {
      if (specialty === 'nodejs' || specialty === 'react' || specialty === 'vue') {
        commands.push('npm install');
      } else if (specialty === 'python') {
        commands.push('pip install -r requirements.txt');
      } else if (specialty === 'go') {
        commands.push('go mod tidy');
      } else if (specialty === 'rust') {
        commands.push('cargo build');
      }
    }

    if (lower_desc.includes('测试')) {
      if (specialty === 'nodejs' || specialty === 'react' || specialty === 'vue') {
        commands.push('npm test');
      } else if (specialty === 'python') {
        commands.push('python -m pytest');
      } else if (specialty === 'go') {
        commands.push('go test ./...');
      } else if (specialty === 'rust') {
        commands.push('cargo test');
      }
    }

    if (lower_desc.includes('构建') || lower_desc.includes('编译')) {
      if (specialty === 'nodejs' || specialty === 'react' || specialty === 'vue') {
        commands.push('npm run build');
      } else if (specialty === 'go') {
        commands.push('go build ./...');
      } else if (specialty === 'rust') {
        commands.push('cargo build --release');
      }
    }

    return commands;
  }

  get_agent_status() {
    const status = {};

    for (const [agent_id, agent] of Object.entries(this.agents)) {
      status[agent_id] = {
        specialty: agent.specialty,
        model: agent.model,
        has_project: agent.current_project !== null
      };
    }

    return status;
  }
}

module.exports = {
  TraeAgentWithAutopilot,
  TraeAutopilotOrchestrator
};
