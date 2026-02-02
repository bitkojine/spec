/**
 * @file webview-template.cts
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
                    :root {
                        --ui-spacing: 32px;
                        --glass-bg: rgba(20, 20, 30, 0.75);
                        --glass-border: rgba(255, 255, 255, 0.1);
                        --text-primary: #ffffff;
                        --text-secondary: #aaaaaa;
                        --accent-color: #4caf50;
                    }

                    body { 
                        margin: 0; 
                        padding: 0;
                        overflow: hidden; 
                        background: #1e1e1e;
                        font-family: 'Segoe UI', Inter, system-ui, sans-serif; 
                        user-select: none; 
                    }

                    canvas { 
                        display: block; 
                        width: 100vw; 
                        height: 100vh; 
                    }
                    
                    /* Main UI Layer - Fixed inset ensures uniform gap from all edges */
                    #ui-layer { 
                        position: fixed; 
                        top: var(--ui-spacing); 
                        left: var(--ui-spacing);
                        right: var(--ui-spacing);
                        bottom: var(--ui-spacing);
                        pointer-events: none; 
                        display: flex; 
                        flex-direction: column; 
                        align-items: flex-start;
                        justify-content: space-between;
                        z-index: 5;
                    }

                    /* Floating Card Component */
                    .ui-card { 
                        background: var(--glass-bg); 
                        backdrop-filter: blur(16px); 
                        -webkit-backdrop-filter: blur(16px);
                        border: 1px solid var(--glass-border); 
                        border-radius: 12px; 
                        padding: 20px; 
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                        pointer-events: auto;
                        min-width: 260px;
                    }

                    #app-header {
                        margin-bottom: 0; /* Reset margins */
                    }

                    h1 { 
                        font-size: 20px; 
                        font-weight: 800; 
                        margin: 0 0 8px 0; 
                        color: var(--text-primary); 
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                    }

                    #status-line { 
                        font-size: 13px; 
                        color: var(--text-secondary); 
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 20px;
                        font-weight: 500;
                    }

                    #status-dot {
                        width: 8px;
                        height: 8px;
                        background-color: var(--accent-color);
                        border-radius: 50%;
                        box-shadow: 0 0 8px var(--accent-color);
                    }

                    /* Controls Section */
                    .controls-grid { 
                        display: grid;
                        grid-template-columns: auto 1fr;
                        gap: 12px 16px;
                        align-items: center;
                        background: rgba(255,255,255,0.03);
                        padding: 16px;
                        border-radius: 8px;
                    }

                    .key-combo {
                        display: flex;
                        gap: 4px;
                    }

                    .kbd { 
                        background: linear-gradient(180deg, #3a3a3a 0%, #252525 100%);
                        color: #eee; 
                        padding: 4px 8px; 
                        border-radius: 4px; 
                        font-weight: 600; 
                        font-family: 'JetBrains Mono', Consolas, monospace;
                        font-size: 11px;
                        min-width: 20px;
                        text-align: center;
                        border: 1px solid rgba(255,255,255,0.15);
                        border-bottom: 2px solid #111;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    }
                    
                    .action-label {
                        font-size: 13px;
                        color: var(--text-secondary);
                        font-weight: 500;
                    }

                    /* Progress Bar - Integrated into card */
                    #progress-container { 
                        width: 100%; 
                        height: 4px; 
                        background: rgba(255,255,255,0.1); 
                        border-radius: 2px; 
                        overflow: hidden; 
                        margin-top: 16px;
                        display: none; 
                    }

                    #progress-bar { 
                        width: 0%; 
                        height: 100%; 
                        background: var(--accent-color); 
                        transition: width 0.2s ease;
                    }

                    /* Crosshair - Centered independently */
                    #crosshair { 
                        position: fixed; 
                        top: 50%; 
                        left: 50%; 
                        transform: translate(-50%, -50%); 
                        width: 40px; 
                        height: 40px; 
                        pointer-events: none; 
                        opacity: 0.7;
                        z-index: 4;
                    }

                    #crosshair::before, #crosshair::after {
                        content: '';
                        position: absolute;
                        background: rgba(255, 255, 255, 0.9);
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        box-shadow: 0 0 4px rgba(0,0,0,0.5);
                    }
                    
                    #crosshair::before { width: 20px; height: 2px; }
                    #crosshair::after { width: 2px; height: 20px; }

                    /* Focus Blocker */
                    #blocker { 
                        position: fixed; 
                        inset: 0;
                        background-color: rgba(0,0,0,0.6); 
                        backdrop-filter: blur(4px);
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        z-index: 10; 
                        pointer-events: auto;
                    }

                    #instructions { 
                        text-align: center; 
                        color: white; 
                        cursor: pointer;
                        text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                    }
                    
                    #modal-title {
                        font-size: 32px;
                        font-weight: 300;
                        letter-spacing: 2px;
                        margin-bottom: 12px;
                    }
                </style>
            </head>
            <body>
                <div id="blocker">
                    <div id="instructions">
                        <div id="modal-title">CLICK TO FOCUS</div>
                        <div style="font-size: 14px; opacity: 0.8">WASD to Move &bull; SPACE to Jump &bull; MOUSE to Look</div>
                    </div>
                </div>

                <div id="crosshair"></div>

                <div id="ui-layer">
                    <div class="ui-card" id="info-box">
                        <header id="app-header">
                            <h1 id="title">CODE CRAFT</h1>
                        </header>
                        
                        <div id="status-line">
                            <div id="status-dot"></div>
                            <span id="status">Ready</span>
                        </div>

                        <div class="controls-grid" id="controls-hint">
                            <div class="key-combo">
                                <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span>
                            </div> 
                            <span class="action-label">Move</span>

                            <div class="key-combo"><span class="kbd">SPACE</span></div> 
                            <span class="action-label">Jump</span>
                            
                            <div class="key-combo"><span class="kbd">ESC</span></div> 
                            <span class="action-label">Unlock</span>
                        </div>

                        <div id="progress-container">
                            <div id="progress-bar"></div>
                        </div>
                    </div>
                    
                    <!-- Bottom right or other UI elements could go here in the future -->
                </div>

                <canvas id="canvas"></canvas>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
}
