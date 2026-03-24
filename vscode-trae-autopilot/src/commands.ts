import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Command Service
 * Handles core extension commands and interactions with the TRAE AutoPilot system
 */
export class CommandService {
    private _commandHistory: string[] = [];

    /**
     * Scan the project for dependencies and structure
     * @param projectPath The path to the project directory
     */
    public async scan(projectPath: string): Promise<void> {
        try {
            vscode.window.showInformationMessage(`TRAE: Scanning project at ${projectPath}`);

            // Check if package.json exists
            const packageJsonPath = path.join(projectPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                vscode.window.showInformationMessage(`TRAE: Found project: ${packageJson.name || 'Unknown'}`);
                vscode.window.showInformationMessage(`TRAE: Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
            } else {
                vscode.window.showInformationMessage(`TRAE: No package.json found`);
            }

            // Check for other common project files
            const commonFiles = [
                'tsconfig.json',
                'webpack.config.js',
                'README.md',
                'src'
            ];

            commonFiles.forEach(file => {
                const filePath = path.join(projectPath, file);
                if (fs.existsSync(filePath)) {
                    vscode.window.showInformationMessage(`TRAE: Found ${file}`);
                }
            });

            // Add to command history
            this._commandHistory.push(`scan ${projectPath}`);
        } catch (error) {
            vscode.window.showErrorMessage(`TRAE: Error scanning project: ${error}`);
        }
    }

    /**
     * Request a fix for code errors
     * @param filePath The path to the file with errors
     * @param errors The list of errors to fix
     */
    public async requestFix(filePath: string, errors: vscode.Diagnostic[]): Promise<void> {
        try {
            vscode.window.showInformationMessage(`TRAE: Requesting fix for ${errors.length} errors in ${filePath}`);

            // In a real implementation, this would send the errors to the TRAE AutoPilot system
            // For now, we'll just simulate a fix
            setTimeout(() => {
                vscode.window.showInformationMessage(`TRAE: Fixes applied successfully`);
            }, 1000);

            // Add to command history
            this._commandHistory.push(`fix ${filePath} ${errors.length} errors`);
        } catch (error) {
            vscode.window.showErrorMessage(`TRAE: Error requesting fix: ${error}`);
        }
    }

    /**
     * Predict the next command based on history and context
     */
    public async predict(): Promise<void> {
        try {
            vscode.window.showInformationMessage('TRAE: Predicting next command...');

            // In a real implementation, this would use the command history and project context
            // For now, we'll just suggest a common command
            const suggestions = [
                'npm install',
                'npm run build',
                'git status',
                'git commit -m "Update"'
            ];

            const randomIndex = Math.floor(Math.random() * suggestions.length);
            const suggestedCommand = suggestions[randomIndex];

            vscode.window.showInformationMessage(`TRAE: Suggested command: ${suggestedCommand}`);

            // Add to command history
            this._commandHistory.push(`predict`);
        } catch (error) {
            vscode.window.showErrorMessage(`TRAE: Error predicting command: ${error}`);
        }
    }

    /**
     * Get the command history
     */
    public getCommandHistory(): string[] {
        return this._commandHistory;
    }

    /**
     * Clear the command history
     */
    public clearCommandHistory(): void {
        this._commandHistory = [];
    }
}