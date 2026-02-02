/**
 * @file v1.schema.cts
 * @description V1 Contract for Extension-Webview communication.
 */

import { z } from 'zod';

export const SeveritySchema = z.enum(["DEBUG", "INFO", "WARN", "ERROR", "FATAL"]);

export const LogMessageSchema = z.object({
    type: z.literal("LOG"),
    payload: z.object({
        level: SeveritySchema,
        serviceId: z.string(),
        correlationId: z.string(),
        message: z.string(),
        context: z.record(z.string(), z.unknown()).optional(),
        "@timestamp": z.string(),
    }),
});

export const BlockTypeSchema = z.enum([
    'grass', 'dirt', 'stone', 'wood', 'leaf', 'cloud',
    'class_block', 'function_block', 'variable_block'
]);

export const BlockSchema = z.object({
    id: z.string(),
    type: BlockTypeSchema,
    position: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
    }),
    metadata: z.object({
        name: z.string(),
        originalType: z.string().optional(),
    }).optional(),
    color: z.number().optional(),
});

export const UpdateSceneMessageSchema = z.object({
    type: z.literal("UPDATE_SCENE"),
    payload: z.object({
        blocks: z.array(BlockSchema),
        originFile: z.string(),
    }),
});

export const ErrorMessageSchema = z.object({
    type: z.literal("ERROR"),
    payload: z.object({
        code: z.string(),
        message: z.string(),
        retryable: z.boolean(),
    }),
});

export const ProgressMessageSchema = z.object({
    type: z.literal("PROGRESS"),
    payload: z.object({
        message: z.string(),
        increment: z.number(),
        totalFiles: z.number().optional(),
        currentFile: z.number().optional(),
    }),
});

export const ExtensionToWebviewMessageSchema = z.discriminatedUnion("type", [
    LogMessageSchema,
    UpdateSceneMessageSchema,
    ErrorMessageSchema,
    ProgressMessageSchema,
]);

export const VisualReportMessageSchema = z.object({
    type: z.literal("VISUAL_REPORT"),
    payload: z.object({
        hasPixels: z.boolean(),
        pixelCount: z.number().optional(),
    }),
});

export const ReadyMessageSchema = z.object({
    type: z.literal("READY"),
});

export const ObjectClickedMessageSchema = z.object({
    type: z.literal("OBJECT_CLICKED"),
    payload: z.object({
        id: z.string(),
    }),
});

export const WebviewToExtensionMessageSchema = z.discriminatedUnion("type", [
    ReadyMessageSchema,
    ObjectClickedMessageSchema,
    VisualReportMessageSchema,
    LogMessageSchema,
]);

export const ContractMeta = {
    owner: "visualizer-core",
    consumers: ["extension", "webview"],
    stability: "stable",
};

export type Severity = z.infer<typeof SeveritySchema>;
export type LogMessage = z.infer<typeof LogMessageSchema>;
export type BlockType = z.infer<typeof BlockTypeSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type UpdateSceneMessage = z.infer<typeof UpdateSceneMessageSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
export type ProgressMessage = z.infer<typeof ProgressMessageSchema>;
export type ExtensionToWebviewMessage = z.infer<typeof ExtensionToWebviewMessageSchema>;
export type VisualReportMessage = z.infer<typeof VisualReportMessageSchema>;
export type WebviewToExtensionMessage = z.infer<typeof WebviewToExtensionMessageSchema>;
