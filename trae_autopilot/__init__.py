"""
TRAE AutoPilot - 具备自我操控能力的AI开发团队
"""

__version__ = "2.0.0"
__author__ = "TRAE Project"
__email__ = "support@trae.ai"
__url__ = "https://trae.ai"

from .enhanced_agent import EnhancedTraeAgent
from .mcp.protocol import MCPCoordinator, AgentMCPClient
from .learning.error_learner import ErrorPatternLearner

__all__ = [
    "EnhancedTraeAgent",
    "MCPCoordinator",
    "AgentMCPClient",
    "ErrorPatternLearner"
]
