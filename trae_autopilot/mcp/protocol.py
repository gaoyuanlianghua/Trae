"""
Multi-Agent Conversation Protocol (MCP)
智能体间协商任务分配协议
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable, Any
from enum import Enum, auto
from datetime import datetime
import json
import asyncio
from collections import deque
import uuid

class MessageType(Enum):
    TASK_ASSIGN = auto()      # 任务分配
    TASK_INQUIRY = auto()    # 任务询价
    CAPABILITY_AD = auto()     # 能力广播
    BID = auto()              # 投标
    COMMIT = auto()           # 承诺
    DELEGATE = auto()         # 委托
    RESULT = auto()           # 结果
    ERROR = auto()            # 错误
    SYNC = auto()             # 状态同步

class TaskPriority(Enum):
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4
    BACKGROUND = 5

@dataclass
class AgentCapability:
    agent_id: str
    specialties: List[str]
    performance_metrics: Dict[str, float]  # 成功率、平均耗时等
    current_load: float  # 0-1
    max_concurrent: int
    active_tasks: int = 0
    
    def can_accept(self, task_complexity: float) -> bool:
        available = self.active_tasks < self.max_concurrent
        capacity = self.current_load + task_complexity <= 1.0
        return available and capacity

@dataclass
class MCPMessage:
    msg_id: str
    msg_type: MessageType
    from_agent: str
    to_agent: Optional[str]  # None表示广播
    payload: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)
    ttl: int = 3  # 消息存活跳数
    
    def forward(self) -> Optional['MCPMessage']:
        """转发消息，TTL减1"""
        if self.ttl <= 1:
            return None
        return MCPMessage(
            msg_id=self.msg_id,
            msg_type=self.msg_type,
            from_agent=self.from_agent,
            to_agent=self.to_agent,
            payload=self.payload,
            ttl=self.ttl - 1
        )

class MCPCoordinator:
    """MCP协调器 - 智能体间通信中枢"""
    
    def __init__(self):
        self.agents: Dict[str, AgentCapability] = {}
        self.message_bus: asyncio.Queue = asyncio.Queue()
        self.message_history: deque = deque(maxlen=1000)
        self.subscribers: Dict[MessageType, List[Callable]] = {}
        self.consensus_log: List[Dict] = []
        
    def _generate_id(self) -> str:
        """生成唯一消息ID"""
        return str(uuid.uuid4())
        
    def register_agent(self, agent_id: str, capability: AgentCapability):
        """注册智能体"""
        self.agents[agent_id] = capability
        print(f"[MCP] 智能体注册: {agent_id} ({', '.join(capability.specialties)})")
        
        # 广播新智能体加入
        asyncio.create_task(self.broadcast(
            MessageType.CAPABILITY_AD,
            {'capability': capability.__dict__},
            exclude=agent_id
        ))
    
    async def send(self, message: MCPMessage):
        """发送消息"""
        self.message_history.append(message)
        
        if message.to_agent:
            # 点对点
            await self._deliver(message)
        else:
            # 广播
            await self.broadcast(message.msg_type, message.payload,
                               exclude=message.from_agent)
    
    async def broadcast(self, msg_type: MessageType, payload: Dict,
                       exclude: Optional[str] = None):
        """广播消息"""
        for agent_id in self.agents:
            if agent_id != exclude:
                msg = MCPMessage(
                    msg_id=self._generate_id(),
                    msg_type=msg_type,
                    from_agent='coordinator',
                    to_agent=agent_id,
                    payload=payload
                )
                await self._deliver(msg)
    
    async def _deliver(self, message: MCPMessage):
        """实际投递消息"""
        # 这里可以实现WebSocket、消息队列等
        handler = self.subscribers.get(message.msg_type, [])
        for h in handler:
            asyncio.create_task(h(message))
    
    def subscribe(self, msg_type: MessageType, handler: Callable):
        """订阅消息类型"""
        self.subscribers.setdefault(msg_type, []).append(handler)
    
    async def negotiate_task(self, task: Dict) -> Optional[str]:
        """
        任务协商流程：
        1. 广播任务询价
        2. 收集投标
        3. 选择最优智能体
        4. 发送任务承诺
        """
        task_id = self._generate_id()
        
        # 1. 广播询价
        inquiry = MCPMessage(
            msg_id=task_id,
            msg_type=MessageType.TASK_INQUIRY,
            from_agent='coordinator',
            to_agent=None,  # 广播
            payload={
                'task_id': task_id,
                'description': task['description'],
                'required_specialties': task['specialties'],
                'estimated_complexity': task.get('complexity', 0.5),
                'priority': task.get('priority', TaskPriority.NORMAL).value,
                'deadline': task.get('deadline')
            }
        )
        
        bids = []
        bid_collector = asyncio.Event()
        
        async def collect_bid(msg: MCPMessage):
            if msg.msg_type == MessageType.BID:
                bids.append({
                    'agent': msg.from_agent,
                    'bid': msg.payload
                })
                if len(bids) >= len(self.agents) * 0.5:  # 50%响应即可
                    bid_collector.set()
        
        self.subscribe(MessageType.BID, collect_bid)
        await self.send(inquiry)
        
        # 等待投标 (超时5秒)
        try:
            await asyncio.wait_for(bid_collector.wait(), timeout=5.0)
        except asyncio.TimeoutError:
            pass
        
        # 3. 选择最优投标
        if not bids:
            return None
        
        best_bid = self._select_best_bid(bids, task)
        selected_agent = best_bid['agent']
        
        # 4. 发送承诺
        commit = MCPMessage(
            msg_id=self._generate_id(),
            msg_type=MessageType.COMMIT,
            from_agent='coordinator',
            to_agent=selected_agent,
            payload={
                'task_id': task_id,
                'assignment': task,
                'accepted_bid': best_bid['bid']
            }
        )
        await self.send(commit)
        
        # 更新智能体负载
        self.agents[selected_agent].active_tasks += 1
        self.agents[selected_agent].current_load += task.get('complexity', 0.5)
        
        self.consensus_log.append({
            'task_id': task_id,
            'assigned_to': selected_agent,
            'bids_considered': len(bids),
            'timestamp': datetime.now()
        })
        
        return selected_agent
    
    def _select_best_bid(self, bids: List[Dict], task: Dict) -> Dict:
        """选择最优投标"""
        def score_bid(bid):
            agent = self.agents[bid['agent']]
            score = 0
            
            # 专长匹配度
            specialty_match = len(set(agent.specialties) & set(task['specialties']))
            score += specialty_match * 10
            
            # 历史成功率
            score += agent.performance_metrics.get('success_rate', 0.5) * 20
            
            # 当前负载 (越低越好)
            score += (1 - agent.current_load) * 15
            
            # 投标报价 (如果有)
            if 'estimated_time' in bid['bid']:
                score -= bid['bid']['estimated_time'] * 0.5  # 时间越短越好
            
            return score
        
        return max(bids, key=score_bid)
    
    async def delegate_subtask(self, parent_agent: str, subtask: Dict,
                              to_specialty: str) -> str:
        """智能体委托子任务"""
        # 找到专长匹配且非自己的智能体
        candidates = [
            aid for aid, cap in self.agents.items()
            if to_specialty in cap.specialties and aid != parent_agent
        ]
        
        if not candidates:
            # 回退到自己执行
            return parent_agent
        
        # 选择负载最低的
        best = min(candidates,
                  key=lambda a: self.agents[a].current_load)
        
        delegate_msg = MCPMessage(
            msg_id=self._generate_id(),
            msg_type=MessageType.DELEGATE,
            from_agent=parent_agent,
            to_agent=best,
            payload={
                'parent_task': subtask.get('parent_id'),
                'subtask': subtask,
                'delegated_by': parent_agent
            }
        )
        
        await self.send(delegate_msg)
        return best

class AgentMCPClient:
    """智能体的MCP客户端"""
    
    def __init__(self, agent_id: str, coordinator: MCPCoordinator):
        self.agent_id = agent_id
        self.coordinator = coordinator
        self.pending_tasks: Dict[str, asyncio.Future] = {}
        self.message_handlers: Dict[MessageType, Callable] = {}
        
        # 注册默认处理器
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        self.coordinator.subscribe(MessageType.TASK_INQUIRY, self._handle_inquiry)
        self.coordinator.subscribe(MessageType.COMMIT, self._handle_commit)
        self.coordinator.subscribe(MessageType.DELEGATE, self._handle_delegate)
    
    async def _handle_inquiry(self, msg: MCPMessage):
        """处理任务询价 - 决定是否投标"""
        task = msg.payload
        my_cap = self.coordinator.agents[self.agent_id]
        
        # 检查能力匹配
        required = set(task['required_specialties'])
        my_specs = set(my_cap.specialties)
        
        if not required.issubset(my_specs):
            return  # 不匹配，不投标
        
        # 检查负载
        complexity = task['estimated_complexity']
        if not my_cap.can_accept(complexity):
            return  # 无法接受
        
        # 计算投标
        estimated_time = self._estimate_time(task)
        confidence = self._calculate_confidence(task)
        
        bid = MCPMessage(
            msg_id=self.coordinator._generate_id(),
            msg_type=MessageType.BID,
            from_agent=self.agent_id,
            to_agent='coordinator',
            payload={
                'task_id': task['task_id'],
                'estimated_time': estimated_time,
                'confidence': confidence,
                'current_load': my_cap.current_load
            }
        )
        
        await self.coordinator.send(bid)
    
    async def _handle_commit(self, msg: MCPMessage):
        """处理任务承诺 - 开始执行"""
        assignment = msg.payload['assignment']
        task_id = msg.payload['task_id']
        
        print(f"[{self.agent_id}] 接受任务: {assignment['description'][:50]}...")
        
        # 通知等待的future
        if task_id in self.pending_tasks:
            self.pending_tasks[task_id].set_result(assignment)
    
    async def _handle_delegate(self, msg: MCPMessage):
        """处理委托的子任务"""
        subtask = msg.payload['subtask']
        parent = msg.payload['delegated_by']
        
        print(f"[{self.agent_id}] 接受来自 {parent} 的委托: {subtask['description'][:50]}...")
        
        # 执行子任务
        result = await self.execute_subtask(subtask)
        
        # 返回结果
        result_msg = MCPMessage(
            msg_id=self.coordinator._generate_id(),
            msg_type=MessageType.RESULT,
            from_agent=self.agent_id,
            to_agent=parent,
            payload={
                'subtask_id': subtask['id'],
                'result': result
            }
        )
        await self.coordinator.send(result_msg)
    
    def _estimate_time(self, task: Dict) -> float:
        """估算任务耗时"""
        # 基于历史记忆估算
        base = task.get('estimated_complexity', 0.5) * 10  # 基础分钟数
        # 根据历史成功率调整
        my_cap = self.coordinator.agents[self.agent_id]
        success_factor = 1 / max(my_cap.performance_metrics.get('success_rate', 0.5), 0.1)
        return base * success_factor
    
    def _calculate_confidence(self, task: Dict) -> float:
        """计算完成信心度"""
        my_cap = self.coordinator.agents[self.agent_id]
        
        # 专长匹配度
        required = set(task['required_specialties'])
        my_specs = set(my_cap.specialties)
        match_ratio = len(required & my_specs) / len(required)
        
        # 历史成功率
        success_rate = my_cap.performance_metrics.get('success_rate', 0.5)
        
        # 负载影响
        load_factor = 1 - my_cap.current_load * 0.5
        
        return match_ratio * success_rate * load_factor
    
    async def execute_subtask(self, subtask: Dict) -> Dict:
        """执行子任务 (子类实现)"""
        raise NotImplementedError
    
    async def request_task(self, description: str, specialties: List[str]) -> Dict:
        """主动请求任务分配"""
        future = asyncio.Future()
        task_id = self.coordinator._generate_id()
        self.pending_tasks[task_id] = future
        
        await self.coordinator.negotiate_task({
            'id': task_id,
            'description': description,
            'specialties': specialties,
            'requester': self.agent_id
        })
        
        return await asyncio.wait_for(future, timeout=30.0)
    
    async def send_result(self, task_id: str, result: Dict):
        """发送任务结果"""
        result_msg = MCPMessage(
            msg_id=self.coordinator._generate_id(),
            msg_type=MessageType.RESULT,
            from_agent=self.agent_id,
            to_agent='coordinator',
            payload={
                'task_id': task_id,
                'result': result,
                'success': result.get('success', True)
            }
        )
        
        await self.coordinator.send(result_msg)
    
    async def send_error(self, task_id: str, error: str):
        """发送错误信息"""
        error_msg = MCPMessage(
            msg_id=self.coordinator._generate_id(),
            msg_type=MessageType.ERROR,
            from_agent=self.agent_id,
            to_agent='coordinator',
            payload={
                'task_id': task_id,
                'error': error,
                'timestamp': datetime.now().isoformat()
            }
        )
        
        await self.coordinator.send(error_msg)