import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { CreateValidatorRequest, Validator, Alert } from "../types";
import { apiService } from "../services/api";

interface ValidatorFormState extends CreateValidatorRequest {}

const initialFormState: ValidatorFormState = {
  name: "",
  beaconNodeUrl: "",
};

const getRecentAlerts = (alerts?: Alert[]): Alert[] => {
  if (!alerts || alerts.length === 0) {
    return [];
  }

  return [...alerts]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);
};

const formatCreatedAt = (value: string): string => {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch (_error) {
    return "Unknown";
  }
};

export default function ValidatorsPage() {
  const queryClient = useQueryClient();
  const [formState, setFormState] =
    useState<ValidatorFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [keyLoadingId, setKeyLoadingId] = useState<string | null>(null);

  const validatorsQuery = useQuery(
    "validators",
    () => apiService.getValidators(),
    {
      refetchOnWindowFocus: false,
    }
  );

  const validators: Validator[] = useMemo(() => {
    if (!validatorsQuery.data?.success || !validatorsQuery.data.data) {
      return [];
    }
    return validatorsQuery.data.data.validators ?? [];
  }, [validatorsQuery.data]);

  const loadErrorMessage = useMemo(() => {
    if (validatorsQuery.error) {
      return validatorsQuery.error instanceof Error
        ? validatorsQuery.error.message
        : "Failed to load validators";
    }

    if (validatorsQuery.data && !validatorsQuery.data.success) {
      return validatorsQuery.data.error ?? "Failed to load validators";
    }

    return null;
  }, [validatorsQuery.error, validatorsQuery.data]);

  const createValidatorMutation = useMutation(
    (payload: CreateValidatorRequest) => apiService.createValidator(payload),
    {
      onSuccess: (response) => {
        if (response.success) {
          toast.success("Validator created");
          setFormState(initialFormState);
          setFormErrors({});
          queryClient.invalidateQueries("validators");
        } else {
          toast.error(response.error ?? "Failed to create validator");
        }
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Failed to create validator";
        toast.error(message);
      },
    }
  );

  const updateValidatorMutation = useMutation(
    ({ id, data }: { id: string; data: Partial<Validator> }) =>
      apiService.updateValidator(id, {
        name: data.name,
        beaconNodeUrl: data.beaconNodeUrl,
        isActive: data.isActive,
      }),
    {
      onSuccess: (response) => {
        if (response.success) {
          toast.success("Validator updated");
          queryClient.invalidateQueries("validators");
        } else {
          toast.error(response.error ?? "Failed to update validator");
        }
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Failed to update validator";
        toast.error(message);
      },
    }
  );

  const deleteValidatorMutation = useMutation(
    (id: string) => apiService.deleteValidator(id),
    {
      onSuccess: (response) => {
        if (response.success) {
          toast.success("Validator deleted");
          queryClient.invalidateQueries("validators");
        } else {
          toast.error(response.error ?? "Failed to delete validator");
        }
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Failed to delete validator";
        toast.error(message);
      },
    }
  );

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formState.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formState.beaconNodeUrl.trim()) {
      errors.beaconNodeUrl = "Beacon node URL is required";
    } else {
      try {
        new URL(formState.beaconNodeUrl);
      } catch (error) {
        errors.beaconNodeUrl = "Enter a valid URL";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    createValidatorMutation.mutate({
      name: formState.name.trim(),
      beaconNodeUrl: formState.beaconNodeUrl.trim(),
    });
  };

  const handleToggleActive = (validator: Validator) => {
    updateValidatorMutation.mutate({
      id: validator.id,
      data: {
        isActive: !validator.isActive,
      },
    });
  };

  const handleDeleteValidator = (validator: Validator) => {
    if (
      window.confirm(
        `Delete validator "${validator.name}"? This cannot be undone.`
      )
    ) {
      deleteValidatorMutation.mutate(validator.id);
    }
  };

  const handleViewApiKey = async (validatorId: string) => {
    try {
      setKeyLoadingId(validatorId);
      const response = await apiService.getValidatorApiKey(validatorId);
      if (response.success && response.data) {
        const key = response.data.agentApiKey;
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(key);
          toast.success("Agent API key copied to clipboard");
        } else {
          toast.success(`Agent API key: ${key}`);
        }
      } else {
        toast.error(response.error ?? "Failed to fetch API key");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch API key"
      );
    } finally {
      setKeyLoadingId(null);
    }
  };

  const handleRegenerateKey = async (validatorId: string) => {
    try {
      setKeyLoadingId(validatorId);
      const response = await apiService.regenerateValidatorApiKey(validatorId);
      if (response.success && response.data) {
        const key = response.data.agentApiKey;
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(key);
          toast.success("New API key generated and copied to clipboard");
        } else {
          toast.success(`New API key: ${key}`);
        }
        queryClient.invalidateQueries("validators");
      } else {
        toast.error(response.error ?? "Failed to regenerate API key");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate API key"
      );
    } finally {
      setKeyLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900">Validators</h1>
        <p className="text-gray-600 mt-1">
          Manage your validators, agent API keys, and alerting configuration
        </p>
      </div>

      <div className="card p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Register New Validator
          </h2>
          <p className="text-sm text-gray-500">
            Provide a friendly name and the beacon node endpoint used for health
            checks.
          </p>
        </div>

        <form
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Validator Name
            </label>
            <input
              type="text"
              name="name"
              className={`input mt-1 ${
                formErrors.name ? "border-danger-300" : ""
              }`}
              placeholder="Mainnet Validator #1"
              value={formState.name}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-danger-600">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Beacon Node URL
            </label>
            <input
              type="url"
              name="beaconNodeUrl"
              className={`input mt-1 ${
                formErrors.beaconNodeUrl ? "border-danger-300" : ""
              }`}
              placeholder="https://your-beacon-node:5052"
              value={formState.beaconNodeUrl}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  beaconNodeUrl: event.target.value,
                }))
              }
            />
            {formErrors.beaconNodeUrl && (
              <p className="mt-1 text-sm text-danger-600">
                {formErrors.beaconNodeUrl}
              </p>
            )}
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createValidatorMutation.isLoading}
            >
              {createValidatorMutation.isLoading
                ? "Saving..."
                : "Create Validator"}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Registered Validators
            </h2>
            <p className="text-sm text-gray-500">
              {validators.length} validator{validators.length === 1 ? "" : "s"}{" "}
              configured
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => validatorsQuery.refetch()}
            disabled={validatorsQuery.isFetching}
          >
            {validatorsQuery.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {validatorsQuery.isLoading ? (
          <div className="text-center py-10 text-gray-500">
            Loading validators…
          </div>
        ) : validators.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {loadErrorMessage ??
              "No validators registered yet. Use the form above to add one."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {loadErrorMessage && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {loadErrorMessage}
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beacon Node
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recent Alerts
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {validators.map((validator) => {
                  const recentAlerts = getRecentAlerts(validator.alerts);
                  return (
                    <tr key={validator.id}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {validator.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {validator.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {validator.beaconNodeUrl}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`status-badge ${
                            validator.isActive
                              ? "status-success"
                              : "status-warning"
                          }`}
                        >
                          {validator.isActive ? "Active" : "Paused"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {recentAlerts.length > 0 ? (
                          <ul className="space-y-1 text-xs">
                            {recentAlerts.map((alert: Alert) => (
                              <li
                                key={alert.id}
                                className="flex items-center gap-2"
                              >
                                <span className="status-badge status-warning">
                                  {alert.status}
                                </span>
                                <span className="text-gray-600 truncate">
                                  {alert.message}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No recent alerts
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatCreatedAt(validator.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewApiKey(validator.id)}
                          disabled={keyLoadingId === validator.id}
                        >
                          {keyLoadingId === validator.id
                            ? "Fetching…"
                            : "Copy Key"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRegenerateKey(validator.id)}
                          disabled={keyLoadingId === validator.id}
                        >
                          {keyLoadingId === validator.id
                            ? "Regenerating…"
                            : "Regenerate Key"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleActive(validator)}
                          disabled={updateValidatorMutation.isLoading}
                        >
                          {validator.isActive ? "Pause" : "Resume"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteValidator(validator)}
                          disabled={deleteValidatorMutation.isLoading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
