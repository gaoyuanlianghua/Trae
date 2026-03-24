import * as vscode from 'vscode';

/**
 * File Watcher Service
 * Monitors file changes and triggers automated workflows
 */
export class FileWatcherService {
    private _watchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private _disposables: vscode.Disposable[] = [];

    constructor() {
        this._initializeWatchers();
    }

    /**
     * Initialize file watchers for common project files
     */
    private _initializeWatchers() {
        // Watch package.json for dependency changes
        const packageWatcher = vscode.workspace.createFileSystemWatcher('**/package.json');
        packageWatcher.onDidChange(uri => this._onPackageJsonChanged(uri));
        packageWatcher.onDidCreate(uri => this._onPackageJsonChanged(uri));
        this._watchers.set('package.json', packageWatcher);
        this._disposables.push(packageWatcher);

        // Watch tsconfig.json for TypeScript configuration changes
        const tsconfigWatcher = vscode.workspace.createFileSystemWatcher('**/tsconfig.json');
        tsconfigWatcher.onDidChange(uri => this._onTsconfigChanged(uri));
        tsconfigWatcher.onDidCreate(uri => this._onTsconfigChanged(uri));
        this._watchers.set('tsconfig.json', tsconfigWatcher);
        this._disposables.push(tsconfigWatcher);

        // Watch README.md for project documentation changes
        const readmeWatcher = vscode.workspace.createFileSystemWatcher('**/README.md');
        readmeWatcher.onDidChange(uri => this._onReadmeChanged(uri));
        readmeWatcher.onDidCreate(uri => this._onReadmeChanged(uri));
        this._watchers.set('README.md', readmeWatcher);
        this._disposables.push(readmeWatcher);
    }

    /**
     * Handle file saved events
     * @param document The saved document
     */
    public onFileSaved(document: vscode.TextDocument) {
        const filePath = document.fileName;
        const fileName = filePath.split('\\').pop() || '';

        switch (fileName) {
            case 'package.json':
                this._onPackageJsonChanged(vscode.Uri.file(filePath));
                break;
            case 'tsconfig.json':
                this._onTsconfigChanged(vscode.Uri.file(filePath));
                break;
            case 'README.md':
                this._onReadmeChanged(vscode.Uri.file(filePath));
                break;
            default:
                // Handle other file types
                this._onOtherFileChanged(document);
                break;
        }
    }

    /**
     * Handle package.json changes
     * @param uri The URI of the changed package.json file
     */
    private _onPackageJsonChanged(uri: vscode.Uri) {
        vscode.window.showInformationMessage(`TRAE: package.json changed at ${uri.fsPath}`);
        // Here we could trigger dependency analysis or installation
    }

    /**
     * Handle tsconfig.json changes
     * @param uri The URI of the changed tsconfig.json file
     */
    private _onTsconfigChanged(uri: vscode.Uri) {
        vscode.window.showInformationMessage(`TRAE: tsconfig.json changed at ${uri.fsPath}`);
        // Here we could trigger TypeScript configuration analysis
    }

    /**
     * Handle README.md changes
     * @param uri The URI of the changed README.md file
     */
    private _onReadmeChanged(uri: vscode.Uri) {
        vscode.window.showInformationMessage(`TRAE: README.md changed at ${uri.fsPath}`);
        // Here we could trigger documentation analysis
    }

    /**
     * Handle other file changes
     * @param document The changed document
     */
    private _onOtherFileChanged(document: vscode.TextDocument) {
        // Check if the file has errors
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);

        if (errors.length > 0) {
            vscode.window.showInformationMessage(`TRAE: File ${document.fileName} has ${errors.length} errors`);
            // Here we could offer to fix the errors
        }
    }

    /**
     * Dispose of all watchers
     */
    public dispose() {
        this._watchers.forEach(watcher => watcher.dispose());
        this._watchers.clear();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}