#!/usr/bin/env python3
"""
TRAE AutoPilot - 具备自我操控能力的AI开发团队
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from typing import List, Optional

from .enhanced_agent import EnhancedTraeAgent
from .mcp.protocol import MCPCoordinator
from .learning.error_learner import ErrorPatternLearner

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('trae-autopilot')

class TraeAutoPilotCLI:
    """TRAE AutoPilot 命令行界面"""
    
    def __init__(self):
        self.coordinator = MCPCoordinator()
        self.error_learner = ErrorPatternLearner()
        self.agents = {}
        self.running = False
    
    def parse_args(self):
        """解析命令行参数"""
        parser = argparse.ArgumentParser(
            description='TRAE AutoPilot - 具备自我操控能力的AI开发团队'
        )
        
        subparsers = parser.add_subparsers(dest='command', help='子命令')
        
        # serve 命令
        serve_parser = subparsers.add_parser('serve', help='启动完整服务')
        serve_parser.add_argument('--agents', type=str, default='react,nodejs,python',
                                 help='要激活的智能体 (逗号分隔)')
        serve_parser.add_argument('--enable-mcp', action='store_true',
                                 help='启用MCP协调器')
        serve_parser.add_argument('--enable-learning', action='store_true',
                                 help='启用错误学习')
        serve_parser.add_argument('--ide-port', type=int, default=8765,
                                 help='IDE服务端口')
        serve_parser.add_argument('--watch', type=str, default=None,
                                 help='要监控的项目目录')
        serve_parser.add_argument('--shell', action='store_true',
                                 help='启动交互式Shell')
        
        # scan 命令
        scan_parser = subparsers.add_parser('scan', help='扫描项目')
        scan_parser.add_argument('path', type=str, default='.',
                               help='项目路径')
        scan_parser.add_argument('--output-json', action='store_true',
                               help='输出JSON格式')
        
        # predict 命令
        predict_parser = subparsers.add_parser('predict', help='预测命令')
        predict_parser.add_argument('--top', type=int, default=3,
                                  help='返回前N个预测')
        predict_parser.add_argument('--min-confidence', type=float, default=0.5,
                                  help='最小置信度')
        
        # run 命令
        run_parser = subparsers.add_parser('run', help='运行已学习的命令')
        run_parser.add_argument('name', type=str,
                              help='命令名称')
        
        # fix 命令
        fix_parser = subparsers.add_parser('fix', help='自动修复错误')
        fix_parser.add_argument('--retry', type=int, default=3,
                              help='重试次数')
        
        return parser.parse_args()
    
    async def serve(self, args):
        """启动完整服务"""
        # 激活智能体
        agent_list = [agent.strip() for agent in args.agents.split(',')]
        for i, specialty in enumerate(agent_list):
            agent_id = f"{specialty}-{i+1}"
            agent = EnhancedTraeAgent(agent_id, specialty, coordinator=self.coordinator)
            self.agents[agent_id] = agent
        
        # 启动服务
        self.running = True
        
        # 显示启动信息
        print("🚀 TRAE AutoPilot v2.0")
        print(f"├─ 智能体团队: {len(self.agents)}名已激活")
        print(f"├─ MCP协调器: {'运行中' if args.enable_mcp else '已禁用'} (端口: {args.ide_port})")
        
        # 统计错误模式
        report = self.error_learner.get_learning_report()
        print(f"├─ 错误学习器: {report['builtin_patterns']}个已知模式, {report['discovered_patterns']}个已发现")
        
        print(f"├─ IDE服务: 等待连接 (WebSocket: ws://localhost:{args.ide_port})")
        if args.watch:
            print(f"├─ 文件监控: {args.watch}")
        print(f"└─ 交互式Shell: {'已启动' if args.shell else '已禁用'}")
        print()
        
        # 启动交互式Shell
        if args.shell:
            await self.start_shell(args.watch)
    
    async def start_shell(self, project_path: Optional[str]):
        """启动交互式Shell"""
        prompt = f"[{project_path or '.'}] > "
        
        while self.running:
            try:
                # 在Windows上使用input()，在Unix上使用更高级的readline
                if sys.platform == 'win32':
                    cmd = input(prompt)
                else:
                    import readline
                    cmd = input(prompt)
                
                if not cmd.strip():
                    continue
                
                if cmd.lower() == 'exit' or cmd.lower() == 'quit':
                    break
                
                # 执行命令
                await self.execute_command(cmd)
                
            except KeyboardInterrupt:
                print()
                break
            except Exception as e:
                print(f"错误: {e}")
    
    async def execute_command(self, cmd: str):
        """执行命令"""
        # 简单的命令处理
        if cmd.startswith('agents'):
            print("活跃智能体:")
            for agent_id, agent in self.agents.items():
                print(f"  - {agent_id} ({agent.specialty})")
        elif cmd.startswith('learn'):
            print("学习报告:")
            report = self.error_learner.get_learning_report()
            for key, value in report.items():
                if key != 'top_patterns':
                    print(f"  {key}: {value}")
        else:
            # 尝试找到合适的智能体执行命令
            best_agent = None
            best_score = 0
            
            for agent in self.agents.values():
                # 简单的专长匹配
                if agent.specialty in cmd:
                    best_agent = agent
                    break
            
            if best_agent:
                result = await best_agent.smart_execute(cmd)
                if result['success']:
                    print(result.get('output', ''))
                else:
                    print(f"执行失败: {result.get('error', '未知错误')}")
            else:
                print("没有找到合适的智能体执行此命令")
    
    async def run(self):
        """运行命令"""
        args = self.parse_args()
        
        if args.command == 'serve':
            await self.serve(args)
        elif args.command == 'scan':
            # 实现扫描功能
            print(f"扫描项目: {args.path}")
        elif args.command == 'predict':
            # 实现预测功能
            print(f"预测命令 (前{args.top}个, 最小置信度: {args.min_confidence})")
        elif args.command == 'run':
            # 实现运行已学习命令
            print(f"运行已学习命令: {args.name}")
        elif args.command == 'fix':
            # 实现自动修复
            print(f"自动修复错误 (重试{args.retry}次)")
        else:
            print("请指定子命令")

def main():
    """主入口函数"""
    cli = TraeAutoPilotCLI()
    asyncio.run(cli.run())

if __name__ == '__main__':
    main()