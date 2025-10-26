import React from 'react';

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
        <p className="text-gray-600 mt-1">
          Configure webhook notifications for system events
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Webhook Management</h3>
          <p className="text-gray-500 mb-6">
            Webhook configuration interface coming soon...
          </p>
          <button className="btn btn-primary">
            Add Webhook
          </button>
        </div>
      </div>
    </div>
  );
}
