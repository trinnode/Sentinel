import React, { useState } from "react";
import {
  CpuChipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "react-query";
import { apiService } from "../services/api";
import { DashboardStats } from "../types";

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  change?: string;
  changeType?: "increase" | "decrease";
}

function StatusCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  change,
  changeType,
}: StatusCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {change && (
            <p
              className={`text-sm ${
                changeType === "increase"
                  ? "text-success-600"
                  : "text-danger-600"
              }`}
            >
              {change}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalValidators: 0,
    activeValidators: 0,
    totalAlerts: 0,
    pendingAlerts: 0,
    healthyAgents: 0,
    totalAgents: 0,
  });

  // Fetch validators
  const { data: validatorsData, isLoading: validatorsLoading } = useQuery(
    "validators",
    () => apiService.getValidators(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      onSuccess: (data) => {
        if (data.success && data.data) {
          const validators = data.data.validators;
          setStats((prev) => ({
            ...prev,
            totalValidators: validators.length,
            activeValidators: validators.filter((v) => v.isActive).length,
          }));
        }
      },
    }
  );

  // Fetch agents
  const { isLoading: agentsLoading } = useQuery(
    "agents",
    () => apiService.getAgents(),
    {
      refetchInterval: 30000,
      onSuccess: (data) => {
        if (data.success && data.data) {
          const agents = data.data.agents;
          const healthyAgents = agents.filter((agent) => {
            const lastSeen = new Date(agent.lastSeen);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return lastSeen > fiveMinutesAgo;
          }).length;

          setStats((prev) => ({
            ...prev,
            totalAgents: agents.length,
            healthyAgents,
          }));
        }
      },
    }
  );

  // Fetch alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery(
    "alerts",
    async () => {
      // For now, we'll get alerts from validators since we don't have a direct alerts endpoint
      const validatorsResponse = await apiService.getValidators();
      if (validatorsResponse.success && validatorsResponse.data) {
        const allAlerts = validatorsResponse.data.validators.flatMap(
          (v) => v.alerts || []
        );
        return { success: true, data: { alerts: allAlerts } };
      }
      return { success: false };
    },
    {
      refetchInterval: 10000, // Refetch every 10 seconds for alerts
      onSuccess: (data) => {
        if (data.success && data.data) {
          const alerts = data.data.alerts;
          const pendingAlerts = alerts.filter(
            (alert) => alert.status === "PENDING"
          ).length;

          setStats((prev) => ({
            ...prev,
            totalAlerts: alerts.length,
            pendingAlerts,
          }));
        }
      },
    }
  );

  const isLoading = validatorsLoading || agentsLoading || alertsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Monitor your blockchain validators and system health
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard
          title="Total Validators"
          value={stats.totalValidators}
          icon={CpuChipIcon}
          color="text-primary-600"
          bgColor="bg-primary-50"
          change="+2 from last month"
          changeType="increase"
        />

        <StatusCard
          title="Active Validators"
          value={stats.activeValidators}
          icon={CheckCircleIcon}
          color="text-success-600"
          bgColor="bg-success-50"
          change={`${Math.round(
            (stats.activeValidators / Math.max(stats.totalValidators, 1)) * 100
          )}% uptime`}
        />

        <StatusCard
          title="Pending Alerts"
          value={stats.pendingAlerts}
          icon={ExclamationTriangleIcon}
          color="text-warning-600"
          bgColor="bg-warning-50"
          change={stats.pendingAlerts > 0 ? "Requires attention" : "All clear"}
          changeType={stats.pendingAlerts > 0 ? "increase" : undefined}
        />

        <StatusCard
          title="Healthy Agents"
          value={`${stats.healthyAgents}/${stats.totalAgents}`}
          icon={ChartBarIcon}
          color="text-primary-600"
          bgColor="bg-primary-50"
          change={`${Math.round(
            (stats.healthyAgents / Math.max(stats.totalAgents, 1)) * 100
          )}% connected`}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Validators */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Validators
            </h3>
          </div>
          <div className="p-6">
            {validatorsData?.success &&
            validatorsData.data &&
            validatorsData.data.validators &&
            validatorsData.data.validators.length > 0 ? (
              <div className="space-y-4">
                {validatorsData.data.validators.slice(0, 5).map((validator) => (
                  <div
                    key={validator.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {validator.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {validator.beaconNodeUrl}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          validator.isActive
                            ? "bg-success-50 text-success-700"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {validator.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No validators
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first validator.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => (window.location.href = "/validators")}
                  >
                    Add Validator
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
          </div>
          <div className="p-6">
            {alertsData?.success &&
            alertsData.data &&
            alertsData.data.alerts &&
            alertsData.data.alerts.length > 0 ? (
              <div className="space-y-4">
                {alertsData.data.alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-warning-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {alert.message}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.status === "PENDING"
                            ? "bg-warning-50 text-warning-700"
                            : alert.status === "ACKNOWLEDGED"
                            ? "bg-primary-50 text-primary-700"
                            : "bg-success-50 text-success-700"
                        }`}
                      >
                        {alert.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-success-600" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No alerts
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  All systems are running smoothly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-success-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Backend API</p>
                <p className="text-sm text-gray-500">Operational</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div
                  className={`w-3 h-3 rounded-full ${
                    stats.healthyAgents > 0
                      ? "bg-success-500"
                      : "bg-warning-500"
                  }`}
                ></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Agent Network
                </p>
                <p className="text-sm text-gray-500">
                  {stats.healthyAgents > 0
                    ? "Connected"
                    : "No agents connected"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div
                  className={`w-3 h-3 rounded-full ${
                    stats.pendingAlerts === 0
                      ? "bg-success-500"
                      : "bg-warning-500"
                  }`}
                ></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Alert Status
                </p>
                <p className="text-sm text-gray-500">
                  {stats.pendingAlerts === 0
                    ? "All clear"
                    : `${stats.pendingAlerts} pending`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
