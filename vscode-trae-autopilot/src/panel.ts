import * as vscode from 'vscode';
import * as path from 'path';

export class TraeAutopilotPanel {
    public static currentPanel: TraeAutopilotPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    
    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        
        if (TraeAutopilotPanel.currentPanel) {
            TraeAutopilotPanel.currentPanel._panel.reveal(column);
            return;
        }
        
        const panel = vscode.window.createWebviewPanel(
            'traeAutopilot',
            'TRAE AutoPilot',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );
        
        TraeAutopilotPanel.currentPanel = new TraeAutopilotPanel(panel, extensionUri);
    }
    
    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.webview.html = this._getHtml(extensionUri);
        
        // 处理来自webview的消息
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'scan':
                        // 调用Python后端扫描
                        break;
                    case 'runCommand':
                        const terminal = vscode.window.createTerminal('TRAE');
                        terminal.sendText(message.text);
                        terminal.show();
                        break;
                    case 'learnCommand':
                        // 学习新命令
                        break;
                    case 'predict':
                        // 预测命令
                        vscode.commands.executeCommand('traeAutopilot.predict');
                        break;
                }
            }
        );
    }
    
    private _getHtml(extensionUri: vscode.Uri): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: var(--vscode-font-family); padding: 20px; }
                .agent-card {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 15px;
                    margin: 10px 0;
                }
                .agent-active { border-left: 4px solid #4CAF50; }
                .agent-standby { border-left: 4px solid #FFC107; }
                .command-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin: 5px;
                }
                .log-output {
                    font-family: monospace;
                    background: var(--vscode-terminal-background);
                    padding: 10px;
                    border-radius: 4px;
                    max-height: 200px;
                    overflow-y: auto;
                }
                .prediction {
                    background: var(--vscode-editor-inactiveSelectionBackground);
                    padding: 10px;
                    border-radius: 4px;
                    margin: 5px 0;
                }
            </style>
        </head>
        <body>
            <h2>🚀 TRAE AutoPilot 控制台</h2>
            
            <div class="agent-card agent-active">
                <h3>🎨 ReactAgent (fe-react-001)</h3>
                <p>状态: 活跃 | 记忆: 23条 | 成功率: 94%</p >
                <button class="command-btn" onclick="runCommand('npm run dev')">启动开发服务器</button>
                <button class="command-btn" onclick="runCommand('npm test')">运行测试</button>
                <button class="command-btn" onclick="predict()">🔮 预测下一步</button>
            </div>
            
            <div class="agent-card agent-standby">
                <h3>🐍 PythonAgent (be-python-001)</h3>
                <p>状态: 待机 | 记忆: 15条</p >
            </div>
            
            <h3>📊 预测建议</h3>
            <div class="prediction">
                <strong>95% 置信度</strong>: 检测到 node_modules 缺失<br>
                建议: <code>npm install</code>
            </div>
            
            <h3>📝 执行日志</h3>
            <div class="log-output" id="logs">
                > npm run lint<br>
                ✓ 42 files checked, no errors<br>
                > npm test<br>
                ✓ 156 tests passed
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                function runCommand(cmd) {
                    vscode.postMessage({ command: 'runCommand', text: cmd });
                }
                function predict() {
                    vscode.postMessage({ command: 'predict' });
                }
            </script>
        </body>
        </html>`;
    }
}