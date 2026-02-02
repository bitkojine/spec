/**
 * @file contract.cts
 * @description Defines the formal interface between the VSCode Extension and the Webview.
 * Following architecture/01-contracts.md.
 */

export type Severity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogMessage {
    type: "LOG";
    payload: {
        level: Severity;
        serviceId: string;
        correlationId: string;
        message: string;
        context?: Record<string, unknown>;
        "@timestamp": string;
    };
}

export type BlockType = 'grass' | 'dirt' | 'stone' | 'wood' | 'leaf' | 'cloud' | 'class_block' | 'function_block' | 'variable_block';

export interface Block {
    id: string;
    type: BlockType;
    position: { x: number; y: number; z: number };
    metadata?: {
        name: string;
        originalType?: string;
    };
    color?: number; // Optional override (Hex)
}

export interface UpdateSceneMessage {
    type: "UPDATE_SCENE";
    payload: {
        blocks: Block[];
        originFile: string;
    };
}

export interface ErrorMessage {
    type: "ERROR";
    payload: {
        code: string;
        message: string;
        retryable: boolean;
    };
}

export interface ProgressMessage {
    type: "PROGRESS";
    payload: {
        message: string;
        increment: number;
        totalFiles?: number;
        currentFile?: number;
    };
}

/**
 * Union of all messages that can be sent FROM the Extension TO the Webview.
 */
export type ExtensionToWebviewMessage =
    | LogMessage
    | UpdateSceneMessage
    | ErrorMessage
    | ProgressMessage;

export interface VisualReportMessage {
    type: "VISUAL_REPORT";
    payload: {
        hasPixels: boolean;
        pixelCount?: number;
    };
}

/**
 * Union of all messages that can be sent FROM the Webview TO the Extension.
 */
export type WebviewToExtensionMessage =
    | { type: "READY" }
    | { type: "OBJECT_CLICKED"; payload: { id: string } }
    | VisualReportMessage
    | LogMessage;

/**
 * Type guard for Extension messages.
 */
export function isExtensionMessage(data: unknown): data is ExtensionToWebviewMessage {
    if (typeof data !== "object" || !data) return false;
    const msg = data as Record<string, unknown>;
    return ["LOG", "UPDATE_SCENE", "ERROR", "PROGRESS"].includes(msg.type as string);
}

export function isWebviewMessage(data: unknown): data is WebviewToExtensionMessage {
    if (typeof data !== "object" || !data) return false;
    const msg = data as Record<string, unknown>;
    return ["READY", "OBJECT_CLICKED", "VISUAL_REPORT", "LOG"].includes(msg.type as string);
}
