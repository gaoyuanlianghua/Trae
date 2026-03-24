package com.trae.autopilot

import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.openapi.vfs.newvfs.BulkFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.util.messages.MessageBusConnection
import kotlinx.coroutines.*
import java.io.BufferedReader
import java.io.InputStreamReader

@Service(Service.Level.PROJECT)
class TraeAutoPilotService(private val project: Project) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var connection: MessageBusConnection? = null
    private val agentStates = mutableMapOf<String, AgentState>()
    
    data class AgentState(
        val id: String,
        val specialty: String,
        var isActive: Boolean = false,
        var memoryCount: Int = 0,
        var successRate: Double = 0.0
    )
    
    fun start() {
        // 启动文件监控
        connection = project.messageBus.connect()
        connection?.subscribe(VirtualFileManager.VFS_CHANGES, object : BulkFileListener {
            override fun after(events: List<VFileEvent>) {
                handleFileChanges(events)
            }
        })
        
        // 初始化智能体
        scope.launch {
            scanProject(project.basePath ?: return@launch)
        }
    }
    
    private fun handleFileChanges(events: List<VFileEvent>) {
        val changedFiles = events.mapNotNull { it.path }
        
        scope.launch {
            // 调用Python后端处理
            val result = executeTraeCommand(
                "handle-changes",
                mapOf("files" to changedFiles.joinToString(","))
            )
            updateUI(result)
        }
    }
    
    private suspend fun scanProject(path: String): String = withContext(Dispatchers.IO) {
        executeTraeCommand("scan", mapOf("path" to path))
    }
    
    fun runLearnedCommand(name: String) {
        scope.launch {
            val result = executeTraeCommand("run", mapOf("name" to name))
            showNotification("TRAE", result)
        }
    }
    
    fun predictNextCommands() {
        scope.launch {
            val result = executeTraeCommand("predict", emptyMap())
            // 显示预测结果在工具窗口
            TraeToolWindowFactory.updatePredictions(result)
        }
    }
    
    private fun executeTraeCommand(cmd: String, params: Map<String, String>): String {
        val pb = ProcessBuilder(
            "trae-autopilot",
            "--json",
            cmd,
            *params.flatMap { listOf("--${it.key}", it.value) }.toTypedArray()
        )
        
        val process = pb.start()
        return BufferedReader(InputStreamReader(process.inputStream)).use { it.readText() }
    }
    
    fun dispose() {
        connection?.disconnect()
        scope.cancel()
    }
    
    private fun showNotification(title: String, content: String) {
        // 实现通知显示
    }
    
    private fun updateUI(result: String) {
        // 实现UI更新
    }
}

// 工具窗口
class TraeToolWindowFactory : com.intellij.openapi.wm.ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: com.intellij.openapi.wm.ToolWindow) {
        val panel = javax.swing.JPanel(javax.swing.BorderLayout())
        
        // 智能体状态面板
        val agentsPanel = javax.swing.JPanel().apply {
            layout = javax.swing.BoxLayout(this, javax.swing.BoxLayout.Y_AXIS)
            border = com.intellij.ui.JBUI.Borders.empty(10)
        }
        
        // 添加智能体卡片
        listOf(
            "fe-react-001" to "React前端",
            "be-node-001" to "Node后端",
            "db-001" to "数据库"
        ).forEach { (id, name) ->
            agentsPanel.add(createAgentCard(id, name))
        }
        
        // 快速操作按钮
        val actionsPanel = javax.swing.JPanel(javax.swing.FlowLayout()).apply {
            add(javax.swing.JButton("🔍 扫描项目").apply {
                addActionListener { project.getService(TraeAutoPilotService::class.java).start() }
            })
            add(javax.swing.JButton("🔮 预测").apply {
                addActionListener { project.getService(TraeAutoPilotService::class.java).predictNextCommands() }
            })
            add(javax.swing.JButton("📚 学习命令").apply {
                addActionListener { showLearnDialog() }
            })
        }
        
        panel.add(actionsPanel, javax.swing.BorderLayout.NORTH)
        panel.add(com.intellij.ui.components.JBScrollPane(agentsPanel), javax.swing.BorderLayout.CENTER)
        
        val content = com.intellij.ui.content.ContentFactory.getInstance().createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)
    }
    
    private fun createAgentCard(id: String, name: String): javax.swing.JComponent {
        return javax.swing.JPanel(javax.swing.BorderLayout()).apply {
            border = com.intellij.ui.JBUI.Borders.empty(5)
            background = com.intellij.ui.JBColor(0xF5F5F5, 0x3C3F41)
            
            add(javax.swing.JLabel("🤖 $name").apply {
                font = font.deriveFont(java.awt.Font.BOLD)
            }, javax.swing.BorderLayout.NORTH)
            
            add(javax.swing.JLabel("ID: $id | 状态: 活跃 | 记忆: 23"), javax.swing.BorderLayout.CENTER)
        }
    }
    
    private fun showLearnDialog() {
        // 实现学习命令对话框
    }
    
    companion object {
        fun updatePredictions(result: String) {
            // 实现预测结果更新
        }
    }
}