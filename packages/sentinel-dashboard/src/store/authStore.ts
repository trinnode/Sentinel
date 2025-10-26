import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, AuthState, STORAGE_KEYS } from "../types";
import { apiService } from "../services/api";

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        try {
          const response = await apiService.login(email, password);

          if (response.success && response.data) {
            const { user, token } = response.data;

            // Update API service with token
            apiService.setAuthToken(token);

            // Update local storage
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            throw new Error(response.error || "Login failed");
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name?: string) => {
        try {
          const response = await apiService.register(email, password, name);

          if (response.success && response.data) {
            const { user, token } = response.data;

            // Update API service with token
            apiService.setAuthToken(token);

            // Update local storage
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            throw new Error(response.error || "Registration failed");
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear API service authentication
        apiService.logout();

        // Clear local storage
        localStorage.removeItem(STORAGE_KEYS.USER);

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      initialize: async () => {
        try {
          const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          const userStr = localStorage.getItem(STORAGE_KEYS.USER);

          if (token && userStr) {
            // Set token in API service
            apiService.setAuthToken(token);

            // Verify token is still valid by fetching current user
            try {
              const response = await apiService.getCurrentUser();

              if (response.success && response.data) {
                set({
                  user: response.data,
                  token,
                  isAuthenticated: true,
                  isLoading: false,
                });
              } else {
                // Token invalid, logout
                get().logout();
              }
            } catch (error) {
              // Token invalid, logout
              get().logout();
            }
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error("Error initializing auth store:", error);
          set({ isLoading: false });
        }
      },

      updateUser: (user: User) => {
        set({ user });
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      },
    }),
    {
      name: "sentinel-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
