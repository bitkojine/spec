/**
 * @file contract.cts
 * @description Defines the formal interface between the VSCode Extension and the Webview.
 * Following architecture/01-contracts.md.
 */

import {
    ExtensionToWebviewMessageSchema,
    WebviewToExtensionMessageSchema,
    type ExtensionToWebviewMessage as ExtensionToWebviewMessageType,
    type WebviewToExtensionMessage as WebviewToExtensionMessageType,
    type Block as SchemaBlock,
    type BlockType as SchemaBlockType,
    type VisualReportMessage as VisualReportMessageType,
    type LogMessage as LogMessageType
} from '../../contracts/messages/v1.schema.cjs';

export { ExtensionToWebviewMessageSchema, WebviewToExtensionMessageSchema };

export type Severity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export type BlockType = SchemaBlockType;
export type Block = SchemaBlock;
export type LogMessage = LogMessageType;
export type UpdateSceneMessage = Extract<ExtensionToWebviewMessageType, { type: "UPDATE_SCENE" }>;
export type ErrorMessage = Extract<ExtensionToWebviewMessageType, { type: "ERROR" }>;
export type ProgressMessage = Extract<ExtensionToWebviewMessageType, { type: "PROGRESS" }>;
export type VisualReportMessage = VisualReportMessageType;

/**
 * Union of all messages that can be sent FROM the Extension TO the Webview.
 */
export type ExtensionToWebviewMessage = ExtensionToWebviewMessageType;

/**
 * Union of all messages that can be sent FROM the Webview TO the Extension.
 */
export type WebviewToExtensionMessage = WebviewToExtensionMessageType;

/**
 * Type guard for Extension messages with runtime validation.
 */
export function isExtensionMessage(data: unknown): data is ExtensionToWebviewMessage {
    const result = ExtensionToWebviewMessageSchema.safeParse(data);
    return result.success;
}

/**
 * Type guard for Webview messages with runtime validation.
 */
export function isWebviewMessage(data: unknown): data is WebviewToExtensionMessage {
    const result = WebviewToExtensionMessageSchema.safeParse(data);
    return result.success;
}

/**
 * Strict parser for Extension messages.
 * Fails fast if the data does not match the contract.
 */
export function parseExtensionMessage(data: unknown): ExtensionToWebviewMessage {
    return ExtensionToWebviewMessageSchema.parse(data);
}

/**
 * Strict parser for Webview messages.
 * Fails fast if the data does not match the contract.
 */
export function parseWebviewMessage(data: unknown): WebviewToExtensionMessage {
    return WebviewToExtensionMessageSchema.parse(data);
}
