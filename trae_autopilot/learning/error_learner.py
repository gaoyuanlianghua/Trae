"""
错误模式学习系统 - 从失败中自动学习修复策略
"""

import re
import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple, Callable
from collections import defaultdict
from datetime import datetime
from pathlib import Path
import hashlib

@dataclass
class FixStrategy:
    """修复策略"""
    strategy_id: str
    name: str
    action_type: str  # 'install_pkg', 'edit_file', 'run_command', 'config_change'
    action_params: Dict
    
    # 条件判断
    preconditions: List[str]  # 执行前检查
    postconditions: List[str]  # 执行后验证
    
    # 参数模板
    param_templates: Dict[str, str]  # 从错误提取参数的模板

@dataclass
class ErrorPattern:
    """错误模式"""
    pattern_id: str
    error_type: str  # ImportError, SyntaxError, TypeError等
    error_signature: str  # 正则或关键词匹配
    context_signature: str  # 上下文特征
    file_extensions: List[str]
    
    # 修复策略
    fix_strategies: List[FixStrategy]
    
    # 学习统计
    success_count: int = 0
    fail_count: int = 0
    last_success: Optional[datetime] = None
    avg_fix_time: float = 0.0

class ErrorPatternLearner:
    """错误模式学习器"""
    
    def __init__(self, memory_dir: Path = None):
        self.memory_dir = memory_dir or Path.home() / ".trae_autopilot" / "error_patterns"
        self.memory_dir.mkdir(parents=True, exist_ok=True)
        
        self.patterns: Dict[str, ErrorPattern] = {}
        self.error_index: Dict[str, List[str]] = defaultdict(list)  # 错误类型 -> 模式ID
        
        self._load_patterns()
        self._register_builtin_patterns()
    
    def _load_patterns(self):
        """加载已学习的模式"""
        for f in self.memory_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                # 转换fix_strategies字典为FixStrategy对象
                fix_strategies = []
                for strategy_data in data.get('fix_strategies', []):
                    fix_strategies.append(FixStrategy(**strategy_data))
                data['fix_strategies'] = fix_strategies
                # 转换last_success为datetime对象
                if data.get('last_success'):
                    data['last_success'] = datetime.fromisoformat(data['last_success'])
                pattern = ErrorPattern(**data)
                self.patterns[pattern.pattern_id] = pattern
                self.error_index[pattern.error_type].append(pattern.pattern_id)
            except Exception as e:
                print(f"加载错误模式文件 {f} 失败: {e}")
    
    def _register_builtin_patterns(self):
        """注册内置错误模式"""
        builtins = [
            # Python ImportError
            ErrorPattern(
                pattern_id="py_import_missing",
                error_type="ImportError",
                error_signature=r"No module named ['\"]([^'\"]+)['\"]",
                context_signature="python",
                file_extensions=[".py"],
                fix_strategies=[
                    FixStrategy(
                        strategy_id="pip_install",
                        name="pip安装缺失包",
                        action_type="install_pkg",
                        action_params={"manager": "pip", "pkg": "{module}"},
                        preconditions=["pip available"],
                        postconditions=["import {module} succeeds"],
                        param_templates={"module": r"No module named ['\"]([^'\"]+)['\"]"}
                    ),
                    FixStrategy(
                        strategy_id="pip_install_dev",
                        name="pip安装开发依赖",
                        action_type="install_pkg",
                        action_params={"manager": "pip", "pkg": "{module}[dev]"},
                        preconditions=["pip available", "dev mode"],
                        postconditions=[],
                        param_templates={"module": r"No module named ['\"]([^'\"]+)['\"]"}
                    )
                ]
            ),
            
            # Node module not found
            ErrorPattern(
                pattern_id="node_module_missing",
                error_type="MODULE_NOT_FOUND",
                error_signature=r"Cannot find module ['\"]([^'\"]+)['\"]",
                context_signature="nodejs",
                file_extensions=[".js", ".ts", ".tsx", ".jsx"],
                fix_strategies=[
                    FixStrategy(
                        strategy_id="npm_install",
                        name="npm install",
                        action_type="run_command",
                        action_params={"cmd": "npm install"},
                        preconditions=["package.json exists"],
                        postconditions=["node_modules exists"],
                        param_templates={}
                    ),
                    FixStrategy(
                        strategy_id="npm_install_pkg",
                        name="npm安装特定包",
                        action_type="install_pkg",
                        action_params={"manager": "npm", "pkg": "{module}"},
                        preconditions=[],
                        postconditions=["import succeeds"],
                        param_templates={"module": r"Cannot find module ['\"]([^'\"]+)['\"]"}
                    ),
                    FixStrategy(
                        strategy_id="npm_install_types",
                        name="安装TypeScript类型",
                        action_type="install_pkg",
                        action_params={"manager": "npm", "pkg": "@types/{module}", "dev": True},
                        preconditions=["is_typescript_file"],
                        postconditions=["types available"],
                        param_templates={"module": r"Could not find a declaration file for module ['\"]([^'\"]+)['\"]"}
                    )
                ]
            ),
            
            # SyntaxError - 语法错误
            ErrorPattern(
                pattern_id="syntax-error-general",
                error_type="SyntaxError",
                error_signature=r"SyntaxError: (.+)",
                context_signature="code syntax",
                file_extensions=[".py", ".js", ".ts", ".json"],
                fix_strategies=[
                    FixStrategy(
                        strategy_id="check-syntax",
                        name="检查语法错误",
                        action_type="edit_file",
                        action_params={
                            "file_path": "{file_path}",
                            "action": "fix_syntax"
                        },
                        preconditions=[],
                        postconditions=["file_compiles"],
                        param_templates={
                            "file_path": "context.file_path"
                        }
                    )
                ]
            ),
            
            # TypeScript类型错误
            ErrorPattern(
                pattern_id="ts_type_error",
                error_type="TS2345",
                error_signature=r"Argument of type '([^']+)' is not assignable to parameter of type '([^']+)',",
                context_signature="typescript",
                file_extensions=[".ts", ".tsx"],
                fix_strategies=[
                    FixStrategy(
                        strategy_id="add_type_assertion",
                        name="添加类型断言",
                        action_type="edit_file",
                        action_params={"operation": "insert", "content": " as {target_type}"},
                        preconditions=[],
                        postconditions=["type check passes"],
                        param_templates={"target_type": r"parameter of type '([^']+)',"}
                    ),
                    FixStrategy(
                        strategy_id="fix_type_definition",
                        name="修复类型定义",
                        action_type="edit_file",
                        action_params={"operation": "replace_type", "file": "types.ts"},
                        preconditions=[],
                        postconditions=["type check passes"],
                        param_templates={}
                    )
                ]
            ),
            
            # Go mod tidy needed
            ErrorPattern(
                pattern_id="go_mod_tidy",
                error_type="go: inconsistent vendoring",
                error_signature=r"go: inconsistent vendoring|go: updates to go.mod needed",
                context_signature="go",
                file_extensions=[".go"],
                fix_strategies=[
                    FixStrategy(
                        strategy_id="go_mod_tidy",
                        name="go mod tidy",
                        action_type="run_command",
                        action_params={"cmd": "go mod tidy"},
                        preconditions=["go.mod exists"],
                        postconditions=["go.sum consistent"],
                        param_templates={}
                    )
                ]
            ),
            
            # Rust feature gate
            ErrorPattern(
                pattern_id="rust_feature_needed",
                error_type="E0658",
                error_signature=r"feature '([^']+)' is not stable",
                context_signature="rust",
                file_extensions=[".rs"],
                fix_strategies=[
                    FixStrategy(
                        strategy_id="enable_nightly",
                        name="启用nightly特性",
                        action_type="run_command",
                        action_params={"cmd": "rustup run nightly cargo build"},
                        preconditions=["rustup available"],
                        postconditions=["build succeeds"],
                        param_templates={}
                    ),
                    FixStrategy(
                        strategy_id="add_feature_gate",
                        name="添加特性门",
                        action_type="edit_file",
                        action_params={"operation": "insert_at_top", "content": "#![feature({feature})]"},
                        preconditions=[],
                        postconditions=["compilation succeeds"],
                        param_templates={"feature": r"feature '([^']+)'"}
                    )
                ]
            )
        ]
        
        for pattern in builtins:
            self.patterns[pattern.pattern_id] = pattern
            self.error_index[pattern.error_type].append(pattern.pattern_id)
    
    def _save_pattern(self, pattern: ErrorPattern):
        """保存错误模式"""
        data = asdict(pattern)
        # 转换datetime为字符串
        if data.get('last_success'):
            data['last_success'] = data['last_success'].isoformat()
        # 转换FixStrategy对象为字典
        data['fix_strategies'] = [asdict(s) for s in data['fix_strategies']]
        
        file_path = self.memory_dir / f"{pattern.pattern_id}.json"
        file_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    
    def learn_from_error(self, error: str, error_type: str, file_path: str, context: Dict) -> Optional[ErrorPattern]:
        """从错误中学习"""
        # 生成错误签名
        error_signature = self._generate_error_signature(error, error_type)
        context_signature = self._generate_context_signature(context)
        
        # 检查是否已存在类似模式
        existing_pattern = self._find_existing_pattern(error_type, error_signature)
        if existing_pattern:
            # 更新现有模式
            existing_pattern.fail_count += 1
            self._save_pattern(existing_pattern)
            return existing_pattern
        
        # 创建新模式
        pattern_id = self._generate_pattern_id(error_type, error_signature)
        file_ext = Path(file_path).suffix if file_path else ".txt"
        
        # 生成修复策略
        fix_strategies = self._generate_fix_strategies(error, error_type, context)
        
        new_pattern = ErrorPattern(
            pattern_id=pattern_id,
            error_type=error_type,
            error_signature=error_signature,
            context_signature=context_signature,
            file_extensions=[file_ext],
            fix_strategies=fix_strategies
        )
        
        self.patterns[pattern_id] = new_pattern
        self.error_index[error_type].append(pattern_id)
        self._save_pattern(new_pattern)
        
        return new_pattern
    
    def _generate_error_signature(self, error: str, error_type: str) -> str:
        """生成错误签名"""
        # 对于ImportError，提取包名
        if error_type == "ImportError":
            match = re.search(r"No module named '([^']+)', error")
            if match:
                return f"ImportError: No module named '{{package}}'"
        
        # 对于SyntaxError，提取语法错误信息
        elif error_type == "SyntaxError":
            match = re.search(r"SyntaxError: (.+?)(?:,|$)", error)
            if match:
                return f"SyntaxError: {{error}}"
        
        # 通用错误签名
        return error_type
    
    def _generate_context_signature(self, context: Dict) -> str:
        """生成上下文签名"""
        context_parts = []
        if context.get('file_type'):
            context_parts.append(context['file_type'])
        if context.get('code_context'):
            context_parts.append(context['code_context'][:50])  # 取前50个字符
        return " ".join(context_parts) or "unknown"
    
    def _find_existing_pattern(self, error_type: str, error_signature: str) -> Optional[ErrorPattern]:
        """查找现有模式"""
        for pattern_id in self.error_index.get(error_type, []):
            pattern = self.patterns.get(pattern_id)
            if pattern and pattern.error_signature == error_signature:
                return pattern
        return None
    
    def _generate_pattern_id(self, error_type: str, error_signature: str) -> str:
        """生成模式ID"""
        combined = f"{error_type}:{error_signature}"
        hash_obj = hashlib.md5(combined.encode())
        return f"{error_type.lower().replace('error', '')}-{hash_obj.hexdigest()[:8]}"
    
    def _generate_fix_strategies(self, error: str, error_type: str, context: Dict) -> List[FixStrategy]:
        """生成修复策略"""
        strategies = []
        
        # 根据错误类型生成策略
        if error_type == "ImportError":
            # 提取包名
            match = re.search(r"No module named '([^']+)', error")
            if match:
                package = match.group(1)
                strategies.append(FixStrategy(
                    strategy_id=f"fix-import-{package}",
                    name=f"安装包 {package}",
                    action_type="run_command",
                    action_params={
                        "command": "pip",
                        "args": ["install", package]
                    },
                    preconditions=["pip --version"],
                    postconditions=[f"import {package}"],
                    param_templates={}
                ))
        
        elif error_type == "SyntaxError":
            strategies.append(FixStrategy(
                strategy_id="fix-syntax-error",
                name="修复语法错误",
                action_type="edit_file",
                action_params={
                    "file_path": context.get("file_path", ""),
                    "action": "fix_syntax"
                },
                preconditions=[],
                postconditions=["file_compiles"],
                param_templates={}
            ))
        
        return strategies
    
    def get_fix_strategies(self, error: str, error_type: str, file_path: str) -> List[FixStrategy]:
        """获取修复策略"""
        # 查找匹配的模式
        for pattern_id in self.error_index.get(error_type, []):
            pattern = self.patterns.get(pattern_id)
            if pattern:
                # 检查文件扩展名
                file_ext = Path(file_path).suffix
                if file_ext in pattern.file_extensions:
                    # 检查错误签名匹配
                    if re.search(pattern.error_signature, error):
                        return pattern.fix_strategies
        
        # 如果没有匹配的模式，尝试学习
        context = {"file_path": file_path, "file_type": file_ext}
        new_pattern = self.learn_from_error(error, error_type, file_path, context)
        return new_pattern.fix_strategies if new_pattern else []
    
    def update_strategy_success(self, pattern_id: str, strategy_id: str, success: bool, fix_time: float):
        """更新策略成功率"""
        pattern = self.patterns.get(pattern_id)
        if not pattern:
            return
        
        for strategy in pattern.fix_strategies:
            if strategy.strategy_id == strategy_id:
                if success:
                    pattern.success_count += 1
                    pattern.last_success = datetime.now()
                    # 更新平均修复时间
                    pattern.avg_fix_time = ((pattern.avg_fix_time * (pattern.success_count - 1)) + fix_time) / pattern.success_count
                else:
                    pattern.fail_count += 1
                break
        
        self._save_pattern(pattern)
    
    def calculate_pattern_score(self, pattern: ErrorPattern, context: Dict) -> float:
        """计算模式得分"""
        # 基础分
        base = 0.5
        
        # 历史成功率
        total = pattern.success_count + pattern.fail_count
        if total > 0:
            base += (pattern.success_count / total) * 0.3
        
        # 最近成功率加权
        if pattern.last_success:
            days_since = (datetime.now() - pattern.last_success).days
            recency_bonus = max(0, (30 - days_since) / 30 * 0.1)
            base += recency_bonus
        
        # 上下文匹配度
        if context.get('project_type') == pattern.context_signature:
            base += 0.1
        
        return min(base, 1.0)
    
    def execute_fix(self, pattern: ErrorPattern, strategy: FixStrategy, 
                   error_output: str, context: Dict) -> Dict:
        """
        执行修复策略
        """
        # 提取参数
        params = self._extract_params(strategy, error_output)
        
        # 检查前置条件
        for pre in strategy.preconditions:
            if not self._check_condition(pre, context):
                return {'success': False, 'reason': f'precondition failed: {pre}'}
        
        # 执行修复
        start = datetime.now()
        result = self._execute_action(strategy.action_type, 
                                     strategy.action_params, 
                                     params, 
                                     context)
        duration = (datetime.now() - start).total_seconds()
        
        # 验证后置条件
        success = True
        for post in strategy.postconditions:
            if not self._check_condition(post, context, result):
                success = False
                break
        
        # 更新学习统计
        if success:
            pattern.success_count += 1
            pattern.last_success = datetime.now()
        else:
            pattern.fail_count += 1
        
        pattern.avg_fix_time = (pattern.avg_fix_time * (pattern.success_count + pattern.fail_count - 1) + duration) / (pattern.success_count + pattern.fail_count)
        
        self._save_pattern(pattern)
        
        return {
            'success': success,
            'pattern': pattern.pattern_id,
            'strategy': strategy.strategy_id,
            'duration': duration,
            'result': result
        }
    
    def _extract_params(self, strategy: FixStrategy, error_output: str) -> Dict:
        """从错误输出中提取参数"""
        params = {}
        for key, template in strategy.param_templates.items():
            match = re.search(template, error_output)
            if match:
                params[key] = match.group(1)
        return params
    
    def _execute_action(self, action_type: str, action_params: Dict, 
                       extracted_params: Dict, context: Dict) -> Dict:
        """执行修复动作"""
        # 渲染参数
        params = {k: v.format(**extracted_params) for k, v in action_params.items()}
        
        if action_type == 'install_pkg':
            return self._action_install_pkg(params, context)
        elif action_type == 'run_command':
            return self._action_run_command(params, context)
        elif action_type == 'edit_file':
            return self._action_edit_file(params, context)
        elif action_type == 'config_change':
            return self._action_config_change(params, context)
        else:
            return {'error': f'unknown action type: {action_type}'}
    
    def _action_install_pkg(self, params: Dict, context: Dict) -> Dict:
        """安装包"""
        manager = params['manager']
        pkg = params['pkg']
        dev = params.get('dev', False)
        
        commands = {
            'pip': f"pip install {pkg}",
            'npm': f"npm install {'--save-dev' if dev else ''} {pkg}",
            'yarn': f"yarn add {'--dev' if dev else ''} {pkg}",
            'cargo': f"cargo add {pkg}",
            'go': f"go get {pkg}",
        }
        
        cmd = commands.get(manager, f"{manager} install {pkg}")
        
        import subprocess
        result = subprocess.run(cmd.split(), capture_output=True, text=True)
        
        return {
            'command': cmd,
            'exit_code': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
    
    def _action_run_command(self, params: Dict, context: Dict) -> Dict:
        """运行命令"""
        import subprocess
        cmd = params['cmd']
        result = subprocess.run(cmd.split(), capture_output=True, text=True, 
                              cwd=context.get('project_path'))
        return {
            'command': cmd,
            'exit_code': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
    
    def _action_edit_file(self, params: Dict, context: Dict) -> Dict:
        """编辑文件"""
        # 这里可以集成更复杂的代码编辑逻辑
        # 暂时返回待办
        return {
            'action': 'edit_file',
            'params': params,
            'status': 'pending_implementation'
        }
    
    def _action_config_change(self, params: Dict, context: Dict) -> Dict:
        """修改配置"""
        return {
            'action': 'config_change',
            'params': params
        }
    
    def _check_condition(self, condition: str, context: Dict, 
                        result: Dict = None) -> bool:
        """检查条件"""
        # 简化的条件检查
        if condition == 'pip available':
            import shutil
            return shutil.which('pip') is not None
        
        if condition.startswith('file exists:'):
            path = condition.split(':', 1)[1].strip()
            return (Path(context.get('project_path', '.')) / path).exists()
        
        if condition == 'build succeeds' and result:
            return result.get('exit_code') == 0
        
        return True  # 默认通过
    
    def _discover_pattern(self, error_output: str, context: Dict) -> Optional[ErrorPattern]:
        """
        从新的错误中发现潜在模式
        """
        # 识别常见的错误格式
        patterns = [
            (r"error \$\$E(\d+)\$\$ ", "Rust编译错误"),
            (r"error TS(\d+)", "TypeScript错误"),
            (r"SyntaxError:", "Python语法错误"),
            (r"ReferenceError:", "JavaScript引用错误"),
        ]
        
        for regex, desc in patterns:
            if re.search(regex, error_output):
                # 创建新模式
                pattern_id = f"discovered_{hashlib.md5(error_output[:100].encode()).hexdigest()[:8]}"
                
                # 提取错误签名
                lines = error_output.split('\n')
                signature = lines[0][:100] if lines else "unknown"
                
                new_pattern = ErrorPattern(
                    pattern_id=pattern_id,
                    error_type=desc,
                    error_signature=re.escape(signature),
                    context_signature=context.get('project_type', 'unknown'),
                    file_extensions=[context.get('file_extension', '')],
                    fix_strategies=[]  # 空策略，需要人工补充
                )
                
                self.patterns[pattern_id] = new_pattern
                self._save_pattern(new_pattern)
                
                print(f"[ErrorLearner] 发现新模式: {pattern_id} ({desc})")
                return new_pattern
        
        return None
    
    def learn_from_feedback(self, pattern_id: str, strategy_id: str, 
                           success: bool, feedback: str):
        """从反馈中学习"""
        pattern = self.patterns.get(pattern_id)
        if not pattern:
            return
        
        # 更新统计
        if success:
            pattern.success_count += 1
        else:
            pattern.fail_count += 1
        
        # 分析反馈改进策略
        if feedback:
            self._improve_strategy(pattern, strategy_id, feedback)
        
        self._save_pattern(pattern)
    
    def _improve_strategy(self, pattern: ErrorPattern, strategy_id: str, 
                         feedback: str):
        """基于反馈改进策略"""
        strategy = next((s for s in pattern.fix_strategies if s.strategy_id == strategy_id), None)
        if not strategy:
            return
        
        # 简单的反馈分析
        if "timeout" in feedback.lower():
            # 增加超时处理
            strategy.action_params['timeout'] = strategy.action_params.get('timeout', 60) * 2
        
        if "permission" in feedback.lower():
            # 增加权限检查前置条件
            if 'sudo available' not in strategy.preconditions:
                strategy.preconditions.append('sudo available')
    
    def _save_pattern(self, pattern: ErrorPattern):
        """保存模式到磁盘"""
        path = self.memory_dir / f"{pattern.pattern_id}.json"
        path.write_text(json.dumps(asdict(pattern), default=str, indent=2))
    
    def get_learning_report(self) -> Dict:
        """生成学习报告"""
        total_patterns = len(self.patterns)
        builtin = sum(1 for p in self.patterns.values() if p.pattern_id.startswith(('py_', 'node_', 'ts_', 'go_', 'rust_', 'docker_')))
        discovered = total_patterns - builtin
        
        total_attempts = sum(p.success_count + p.fail_count for p in self.patterns.values())
        total_success = sum(p.success_count for p in self.patterns.values())
        
        return {
            'total_patterns': total_patterns,
            'builtin_patterns': builtin,
            'discovered_patterns': discovered,
            'total_fix_attempts': total_attempts,
            'overall_success_rate': total_success / total_attempts if total_attempts > 0 else 0,
            'top_patterns': sorted(
                self.patterns.values(),
                key=lambda p: p.success_count,
                reverse=True
            )[:5]
        }
    
    def analyze_error(self, error_output: str, context: Dict) -> List[Tuple[ErrorPattern, FixStrategy, float]]:
        """分析错误并返回修复策略"""
        fixes = []
        
        # 遍历所有模式
        for pattern in self.patterns.values():
            # 检查文件扩展名匹配
            file_ext = context.get('file_extension', '')
            if file_ext and file_ext not in pattern.file_extensions:
                continue
            
            # 检查错误签名匹配
            if re.search(pattern.error_signature, error_output):
                # 计算模式得分
                score = self.calculate_pattern_score(pattern, context)
                
                # 为每个策略创建修复方案
                for strategy in pattern.fix_strategies:
                    fixes.append((pattern, strategy, score))
        
        # 如果没有找到匹配的模式，尝试发现新模式
        if not fixes:
            new_pattern = self._discover_pattern(error_output, context)
            if new_pattern:
                # 为新模式添加默认策略
                # 这里可以根据错误类型添加默认策略
                pass
        
        # 按置信度排序
        fixes.sort(key=lambda x: x[2], reverse=True)
        
        return fixes