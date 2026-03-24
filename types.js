// 类型定义

// 智能体ID类型
const AgentId = String;

// 项目上下文
const ProjectContext = {
  projectId: String,
  projectName: String,
  currentPhase: String,
  dependencies: Array,
  timeline: Object
};

// 代码片段
const CodeSnippet = {
  language: String,
  code: String,
  file: String,
  line: Number
};

// 智能体消息接口
const AgentMessage = {
  from: AgentId,
  to: AgentId || 'broadcast',
  type: ['task', 'review', 'question', 'suggestion', 'alert'],
  payload: {
    context: ProjectContext,
    code: CodeSnippet,
    requirements: Array,
    deadline: Date
  },
  priority: [1, 2, 3, 4, 5]
};

// 智能体能力注册接口
const AgentCapability = {
  agentId: String,
  languages: Array,
  frameworks: Array,
  maxComplexity: ['simple', 'medium', 'complex', 'enterprise'],
  specialties: Array
};

module.exports = {
  AgentId,
  ProjectContext,
  CodeSnippet,
  AgentMessage,
  AgentCapability
};