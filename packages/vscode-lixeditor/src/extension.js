const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class LixEditorProvider {
  static viewType = 'lixeditor.editor';

  constructor(context) {
    this.context = context;
  }

  static register(context) {
    const provider = new LixEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      LixEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  async resolveCustomTextEditor(document, webviewPanel) {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'webview')),
        vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
      ],
    };

    // Get URIs for webview resources
    const webviewDir = vscode.Uri.file(path.join(this.context.extensionPath, 'webview'));
    const editorJsUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'webview', 'editor.js'))
    );
    const editorCssUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'webview', 'editor.css'))
    );

    // Set HTML content
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, editorJsUri, editorCssUri);

    // Send initial document content to the webview
    const initialContent = document.getText();
    let blocks = [];
    try {
      blocks = initialContent.trim() ? JSON.parse(initialContent) : [];
    } catch {
      blocks = [];
    }

    // Wait for webview to signal ready, then send content
    const messageHandler = webviewPanel.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'ready':
          webviewPanel.webview.postMessage({ type: 'load', blocks });
          break;

        case 'update':
          // Content changed in the editor — write back to the document
          const edit = new vscode.WorkspaceEdit();
          edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            JSON.stringify(message.blocks, null, 2)
          );
          vscode.workspace.applyEdit(edit);
          break;

        case 'info':
          vscode.window.showInformationMessage(message.text);
          break;
      }
    });

    // When the document changes externally, update the webview
    const changeHandler = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString() && e.contentChanges.length > 0) {
        try {
          const newBlocks = JSON.parse(e.document.getText());
          webviewPanel.webview.postMessage({ type: 'load', blocks: newBlocks });
        } catch { /* invalid JSON, ignore */ }
      }
    });

    webviewPanel.onDidDispose(() => {
      messageHandler.dispose();
      changeHandler.dispose();
    });
  }

  getHtmlForWebview(webview, editorJsUri, editorCssUri) {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:; connect-src https:;">
  <link rel="stylesheet" href="${editorCssUri}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,500;0,600;0,650;0,700;1,400;1,500&display=swap" rel="stylesheet">
  <title>LixEditor</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${editorJsUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function activate(context) {
  context.subscriptions.push(LixEditorProvider.register(context));

  // Register "New Document" command
  context.subscriptions.push(
    vscode.commands.registerCommand('lixeditor.newDocument', async () => {
      const uri = vscode.Uri.parse('untitled:New Document.lixeditor');
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
