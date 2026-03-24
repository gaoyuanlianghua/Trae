from .learning.error_learner import ErrorPatternLearner
from .mcp.protocol import MCPCoordinator, AgentMCPClient

class EnhancedTraeAgent(TraeAgentWithAutopilot, AgentMCPClient):
    """增强版智能体 - 整合所有扩展功能"""
    
    def __init__(self, agent_id: str, specialty: str, model: str = "claude-3.5-sonnet", 
                 coordinator: MCPCoordinator = None):
        # 初始化基类
        TraeAgentWithAutopilot.__init__(self, agent_id, specialty, model)
        
        # 初始化MCP
        self.coordinator = coordinator or MCPCoordinator()
        AgentMCPClient.__init__(self, agent_id, self.coordinator)
        
        # 初始化错误学习器
        self.error_learner = ErrorPatternLearner()
        
        # 注册到协调器
        self.coordinator.register_agent(agent_id, self._create_capability())
    
    def _create_capability(self) -> 'AgentCapability':
        from .mcp.protocol import AgentCapability
        return AgentCapability(
            agent_id=self.agent_id,
            specialties=[self.specialty],
            performance_metrics={
                'success_rate': 0.9,
                'avg_response_time': 2.5
            },
            current_load=0.0,
            max_concurrent=3
        )
    
    async def smart_execute(self, cmd: str, context: Dict = None) -> Dict:
        """智能执行 - 带错误修复和MCP协作"""
        context = context or {}
        
        # 1. 尝试执行
        result = self._exec(cmd, context.get('env'))
        
        if result.returncode == 0:
            return {'success': True, 'output': result.stdout}
        
        # 2. 分析错误
        error_context = {
            'project_type': self.specialty,
            'file_extension': context.get('file_extension'),
            'project_path': self.current_project.project_path if self.current_project else '.',
            **context
        }
        
        fixes = self.error_learner.analyze_error(result.stderr, error_context)
        
        # 3. 尝试自动修复
        for pattern, strategy, confidence in fixes:
            if confidence < 0.6:
                continue  # 跳过低置信度
            
            print(f"[{self.agent_id}] 🔧 尝试修复 (置信度: {confidence:.0%}): {strategy.name}")
            
            fix_result = self.error_learner.execute_fix(
                pattern, strategy, result.stderr, error_context
            )
            
            if fix_result['success']:
                # 重试原命令
                retry = self._exec(cmd, context.get('env'))
                if retry.returncode == 0:
                    # 学习这个成功修复
                    self.learn(
                        f"fix_{pattern.pattern_id}",
                        [fix_result['result'].get('command', ''), cmd],
                        {'error_pattern': pattern.pattern_id, 'auto_fixed': True}
                    )
                    return {
                        'success': True,
                        'auto_fixed': True,
                        'pattern': pattern.pattern_id,
                        'output': retry.stdout
                    }
        
        # 4. 尝试MCP协作修复
        if not fixes or all(f[2] < 0.6 for f in fixes):
            delegate_result = await self._request_help(result.stderr, error_context)
            if delegate_result:
                return delegate_result
        
        return {
            'success': False,
            'error': result.stderr,
            'attempted_fixes': len(fixes)
        }
    
    async def _request_help(self, error: str, context: Dict) -> Optional[Dict]:
        """请求其他智能体协助"""
        # 委托给专长匹配的智能体
        helper = await self.coordinator.delegate_subtask(
            self.agent_id,
            {
                'id': f"help_{hash(error[:50])}",
                'description': f"协助修复错误: {error[:100]}",
                'error_details': error,
                'context': context
            },
            to_specialty=self._find_related_specialty(context)
        )
        
        if helper and helper != self.agent_id:
            print(f"[{self.agent_id}] 🤝 请求 {helper} 协助")
            # 等待协助结果
            # 实际实现需要消息等待机制
            return {'delegated_to': helper, 'status': 'pending'}
        
        return None
    
    def _find_related_specialty(self, context: Dict) -> str:
        """找到相关的其他专长"""
        # 简单的映射
        related = {
            'react': 'nodejs',
            'nodejs': 'react',
            'python': 'database',
            'go': 'devops',
        }
        return related.get(self.specialty, 'project_manager')
    
    async def execute_subtask(self, subtask: Dict) -> Dict:
        """MCP要求的子任务执行"""
        # 实际执行子任务
        if 'error_details' in subtask:
            # 这是协助修复任务
            return await self._assist_fix(subtask)
        
        # 普通子任务
        return self.smart_execute(subtask.get('command', ''), subtask.get('context', {}))
    
    async def _assist_fix(self, subtask: Dict) -> Dict:
        """协助修复错误"""
        error = subtask['error_details']
        context = subtask.get('context', {})
        
        # 使用自己的专长分析
        fixes = self.error_learner.analyze_error(error, context)
        
        for pattern, strategy, confidence in fixes:
            if confidence > 0.5:  # 协助时降低阈值
                result = self.error_learner.execute_fix(pattern, strategy, error, context)
                if result['success']:
                    return {
                        'success': True,
                        'fixed_by': self.agent_id,
                        'pattern': pattern.pattern_id,
                        'strategy': strategy.strategy_id
                    }
        
        return {'success': False, 'reason': 'no effective fix found'}