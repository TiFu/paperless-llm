import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { getToken, setToken, clearToken } from '../../services/auth/tokenStorage';
import type { RootState } from '../store';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface CurrentUser {
  username: string;
  canEditSettings: boolean;
}

interface AuthState {
  status: AuthStatus;
  username: string | null;
  canEditSettings: boolean;
  error: string | null;
}

const initialState: AuthState = {
  status: 'idle',
  username: null,
  canEditSettings: false,
  error: null,
};

export const bootstrap = createAsyncThunk<CurrentUser | null, void, { state: RootState }>(
  'auth/bootstrap',
  async () => {
    if (!getToken()) return null;
    return await apiClient.fetchMe();
  },
);

export const login = createAsyncThunk<
  CurrentUser,
  { username: string; password: string },
  { state: RootState }
>(
  'auth/login',
  async ({ username, password }) => {
    const { token } = await apiClient.login(username, password);
    setToken(token);
    return await apiClient.fetchMe();
  },
);

export const logout = createAsyncThunk<void, void, { state: RootState }>(
  'auth/logout',
  async () => {
    clearToken();
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(bootstrap.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(bootstrap.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = 'authenticated';
          state.username = action.payload.username;
          state.canEditSettings = action.payload.canEditSettings;
        } else {
          state.status = 'unauthenticated';
          state.username = null;
          state.canEditSettings = false;
        }
      })
      .addCase(bootstrap.rejected, (state) => {
        clearToken();
        state.status = 'unauthenticated';
        state.username = null;
        state.canEditSettings = false;
      })
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.username = action.payload.username;
        state.canEditSettings = action.payload.canEditSettings;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = action.error.message ?? 'Failed to log in';
      })
      .addCase(logout.fulfilled, (state) => {
        state.status = 'unauthenticated';
        state.username = null;
        state.canEditSettings = false;
        state.error = null;
      });
  },
});

export default authSlice.reducer;

export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectUsername = (state: RootState) => state.auth.username;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectCanEditSettings = (state: RootState) => state.auth.canEditSettings;
