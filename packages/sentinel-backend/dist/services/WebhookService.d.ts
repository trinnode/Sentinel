export interface WebhookPayload {
    event: string;
    timestamp: string;
    data: any;
}
export interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    secret?: string | null;
    events: string[];
    isActive: boolean;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class WebhookService {
    private requestTimeout;
    sendWebhook(webhook: WebhookConfig, payload: WebhookPayload): Promise<boolean>;
    private generateSignature;
    validateSignature(payload: string, signature: string, secret: string): boolean;
    sendTestWebhook(webhookId: string, userId: string): Promise<boolean>;
    processDeliveryResult(webhookId: string, success: boolean, error?: string, responseCode?: number): Promise<void>;
    getWebhookStats(webhookId: string): Promise<any>;
    retryWebhookDelivery(deliveryId: string): Promise<boolean>;
    sendBulkWebhooks(userId: string, event: string, payload: WebhookPayload): Promise<void>;
}
//# sourceMappingURL=WebhookService.d.ts.map