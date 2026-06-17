import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { getToken, setToken, clearToken } from '../../services/auth/tokenStorage';
import type { RootState } from '../store';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  username: string | null;
  error: string | null;
}

const initialState: AuthState = {
  status: 'idle',
  username: null,
  error: null,
};

export const bootstrap = createAsyncThunk<string | null, void, { state: RootState }>(
  'auth/bootstrap',
  async () => {
    if (!getToken()) return null;
    const me = await apiClient.fetchMe();
    return me.username;
  },
);

export const login = createAsyncThunk<
  string,
  { username: string; password: string },
  { state: RootState }
>(
  'auth/login',
  async ({ username, password }) => {
    const { token } = await apiClient.login(username, password);
    setToken(token);
    const me = await apiClient.fetchMe();
    return me.username;
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
          state.username = action.payload;
        } else {
          state.status = 'unauthenticated';
          state.username = null;
        }
      })
      .addCase(bootstrap.rejected, (state) => {
        clearToken();
        state.status = 'unauthenticated';
        state.username = null;
      })
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.username = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = action.error.message ?? 'Failed to log in';
      })
      .addCase(logout.fulfilled, (state) => {
        state.status = 'unauthenticated';
        state.username = null;
        state.error = null;
      });
  },
});

export default authSlice.reducer;

export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectUsername = (state: RootState) => state.auth.username;
export const selectAuthError = (state: RootState) => state.auth.error;
