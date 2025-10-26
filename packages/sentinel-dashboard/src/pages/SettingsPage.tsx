import React from 'react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account and system preferences
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Panel</h3>
          <p className="text-gray-500 mb-6">
            Account and system settings coming soon...
          </p>
          <button className="btn btn-primary">
            Update Profile
          </button>
        </div>
      </div>
    </div>
  );
}
