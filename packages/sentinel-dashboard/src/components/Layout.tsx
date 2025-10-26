import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { useQueryClient } from "react-query";
import { apiService } from "../services/api";
import { WS_EVENTS, WebSocketMessage } from "../types";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Validators", href: "/validators", icon: CpuChipIcon },
  { name: "Agents", href: "/agents", icon: Cog6ToothIcon },
  { name: "Webhooks", href: "/webhooks", icon: BellIcon },
  { name: "Settings", href: "/settings", icon: UserCircleIcon },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleMessage = (message: WebSocketMessage) => {
      if (!message?.type) {
        return;
      }

      switch (message.type) {
        case WS_EVENTS.VALIDATOR_UPDATE: {
          queryClient.invalidateQueries("validators");
          const validatorStatus = message.data?.status;
          if (validatorStatus === "unhealthy") {
            toast.error("Validator requires attention");
          } else if (validatorStatus) {
            toast.success("Validator status updated");
          }
          break;
        }
        case WS_EVENTS.ALERT: {
          queryClient.invalidateQueries("validators");
          const alertMessage = message.data?.alert?.message;
          if (alertMessage) {
            toast.error(alertMessage);
          }
          break;
        }
        case WS_EVENTS.AGENT_UPDATE: {
          queryClient.invalidateQueries("agents");
          break;
        }
        case WS_EVENTS.CONSENSUS_UPDATE: {
          queryClient.invalidateQueries("validators");
          break;
        }
        default:
          break;
      }
    };

    apiService.connectWebSocket(handleMessage);

    return () => {
      apiService.disconnectWebSocket();
    };
  }, [queryClient]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="relative flex w-full max-w-xs flex-col bg-white pt-5 pb-4 shadow-xl">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex flex-shrink-0 items-center px-4">
            <h1 className="text-2xl font-bold text-gray-900">Sentinel</h1>
          </div>
          <div className="mt-5 h-0 flex-1 overflow-y-auto">
            <nav className="px-2">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center rounded-md px-2 py-2 text-base font-medium ${
                        isActive
                          ? "bg-primary-100 text-primary-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.name || user?.email}
                </p>
                <button
                  onClick={handleLogout}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 py-4 shadow-sm border-r border-gray-200">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-2xl font-bold text-gray-900">Sentinel</h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={`group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 ${
                            isActive
                              ? "bg-primary-50 text-primary-600"
                              : "text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                          }`}
                        >
                          <item.icon className="h-6 w-6 shrink-0" />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-gray-900">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {(user?.name || user?.email || "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="sr-only">Your profile</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200 lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {navigation.find((item) => item.href === location.pathname)
                  ?.name || "Dashboard"}
              </h2>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notifications */}
              <button className="text-gray-400 hover:text-gray-600">
                <BellIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
