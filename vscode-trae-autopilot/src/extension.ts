import * as vscode from 'vscode';
import { TraeAutopilotPanel } from './panel';
import { FileWatcherService } from './watcher';
import { CommandService } from './commands';

export function activate(context: vscode.ExtensionContext) {
    const commandService = new CommandService();
    const watcherService = new FileWatcherService();
    
    // 注册命令
    context.subscriptions.push(
        vscode.commands.registerCommand('traeAutopilot.start', () => {
            TraeAutopilotPanel.createOrShow(context.extensionUri);
        }),
        
        vscode.commands.registerCommand('traeAutopilot.scanProject', async () => {
            const folder = vscode.workspace.workspaceFolders?.[0];
            if (folder) {
                await commandService.scan(folder.uri.fsPath);
                vscode.window.showInformationMessage('TRAE: 项目扫描完成');
            }
        }),
        
        vscode.commands.registerCommand('traeAutopilot.runLearned', async (name: string) => {
            const terminal = vscode.window.createTerminal('TRAE AutoPilot');
            terminal.sendText(`trae-autopilot exec-learned ${name}`);
            terminal.show();
        }),
        
        vscode.commands.registerCommand('traeAutopilot.quickFix', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            
            const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
            const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
            
            if (errors.length > 0) {
                // 发送错误给TRAE智能体分析
                await commandService.requestFix(editor.document.uri.fsPath, errors);
            }
        }),
        
        vscode.commands.registerCommand('traeAutopilot.predict', async () => {
            await commandService.predict();
        }),
        
        // 代码操作提供者 - 灯泡菜单
        vscode.languages.registerCodeActionsProvider(
            { pattern: '**/*' },
            new TraeCodeActionProvider(commandService)
        )
    );
    
    // 文件保存自动触发
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(doc => {
            watcherService.onFileSaved(doc);
        })
    );
    
    // 状态栏
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBar.text = "$(robot) TRAE";
    statusBar.tooltip = "TRAE AutoPilot 就绪";
    statusBar.command = 'traeAutopilot.start';
    statusBar.show();
    context.subscriptions.push(statusBar);
}

// 代码操作提供者
class TraeCodeActionProvider implements vscode.CodeActionProvider {
    constructor(private commandService: CommandService) {}
    
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];
        
        // 添加"让TRAE修复"选项
        const fixAction = new vscode.CodeAction(
            '🔧 TRAE 智能修复',
            vscode.CodeActionKind.QuickFix
        );
        fixAction.command = {
            command: 'traeAutopilot.quickFix',
            title: 'TRAE智能修复'
        };
        actions.push(fixAction);
        
        // 添加"预测下一步"选项
        const predictAction = new vscode.CodeAction(
            '🔮 TRAE 预测命令',
            vscode.CodeActionKind.Empty
        );
        predictAction.command = {
            command: 'traeAutopilot.predict',
            title: 'TRAE预测'
        };
        actions.push(predictAction);
        
        return actions;
    }
}