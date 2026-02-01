/**
 * @file webview-template.ts
 * @description Generates the HTML content for the 3D visualizer webview.
 */

import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview-script.js'));

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; connect-src ${webview.cspSource};">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>3D Code World</title>
                <style>
                    body { margin: 0; overflow: hidden; background: #87CEEB; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; user-select: none; }
                    canvas { width: 100vw; height: 100vh; display: block; }
                    #overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
                    #info-box { background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); width: fit-content; max-width: 400px; }
                    #title { font-size: 16px; font-weight: 700; margin-bottom: 5px; color: #fff; text-shadow: 1px 1px 2px black; }
                    #status { font-size: 13px; color: #eee; margin-bottom: 15px; }
                    #controls-hint { margin-top: 10px; font-size: 12px; color: #ddd; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; }
                    .key { background: #fff; color: #333; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-family: monospace; }
                    #blocker { position: absolute; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; pointer-events: auto; z-index: 10; }
                    #instructions { font-size: 36px; color: white; text-align: center; cursor: pointer; }
                    #progress-container { width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden; display: none; margin-top: 10px; }
                    #progress-bar { width: 0%; height: 100%; background: #44ff44; transition: width 0.3s ease; }
                    #crosshair { position: absolute; top: 50%; left: 50%; width: 20px; height: 20px; transform: translate(-50%, -50%); pointer-events: none; }
                    #crosshair::before, #crosshair::after { content: ''; position: absolute; background: rgba(255, 255, 255, 0.8); }
                    #crosshair::before { top: 9px; left: 0; width: 20px; height: 2px; }
                    #crosshair::after { top: 0; left: 9px; width: 2px; height: 20px; }
                </style>
            </head>
            <body>
                <div id="blocker">
                    <div id="instructions">
                        <span>CLICK TO PLAY</span><br/>
                        <span style="font-size: 14px">(WASD to Move, SPACE to Jump, MOUSE to Look)</span>
                    </div>
                </div>
                <div id="overlay">
                    <div id="crosshair"></div>
                    <div id="info-box">
                        <div id="title">CODE CRAFT</div>
                        <div id="status">Generating World...</div>
                        <div id="controls-hint">
                            <span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> Move
                            <span class="key">SPACE</span> Jump
                            <span class="key">ESC</span> Release Mouse
                        </div>
                        <div id="progress-container">
                            <div id="progress-bar"></div>
                        </div>
                    </div>
                </div>
                <canvas id="canvas"></canvas>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
}
