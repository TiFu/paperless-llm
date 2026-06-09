import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import type { RootState } from '../store';

export interface EntityDescriptionItem {
  paperlessId: number;
  name: string;
  description: string | null;
}

export interface EntityDescriptionType {
  type: string;
  label: string;
  entities: EntityDescriptionItem[];
}

interface EntityDescriptionsState {
  entityTypes: EntityDescriptionType[];
  loaded: boolean;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  // Track pending edits: key is `${type}:${paperlessId}`
  pendingDescriptions: Record<string, string | null>;
}

const initialState: EntityDescriptionsState = {
  entityTypes: [],
  loaded: false,
  loading: false,
  syncing: false,
  error: null,
  pendingDescriptions: {},
};

export const fetchEntityDescriptions = createAsyncThunk<
  EntityDescriptionType[],
  void,
  { state: RootState }
>(
  'entityDescriptions/fetch',
  async () => {
    const response = await apiClient.fetchEntityDescriptions();
    return response.entityTypes as EntityDescriptionType[];
  },
);

export const syncEntityDescriptions = createAsyncThunk(
  'entityDescriptions/sync',
  async (_, { dispatch }) => {
    await apiClient.syncEntityDescriptions();
    await dispatch(fetchEntityDescriptions());
  },
);

export const saveEntityDescriptions = createAsyncThunk<
  void,
  { type: string; updates: { paperlessId: number; description: string | null }[] },
  { state: RootState }
>(
  'entityDescriptions/save',
  async ({ type, updates }) => {
    await Promise.all(
      updates.map(({ paperlessId, description }) =>
        apiClient.updateEntityDescription(
          type as 'tag' | 'correspondent' | 'document_type',
          paperlessId,
          description,
        ),
      ),
    );
  },
);

const entityDescriptionsSlice = createSlice({
  name: 'entityDescriptions',
  initialState,
  reducers: {
    setPendingDescription(
      state,
      action: PayloadAction<{ type: string; paperlessId: number; description: string | null }>,
    ) {
      const { type, paperlessId, description } = action.payload;
      state.pendingDescriptions[`${type}:${paperlessId}`] = description;
    },
    clearPendingForType(state, action: PayloadAction<string>) {
      const type = action.payload;
      for (const key of Object.keys(state.pendingDescriptions)) {
        if (key.startsWith(`${type}:`)) {
          delete state.pendingDescriptions[key];
        }
      }
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchEntityDescriptions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEntityDescriptions.fulfilled, (state, action) => {
        state.entityTypes = action.payload;
        state.loaded = true;
        state.loading = false;
      })
      .addCase(fetchEntityDescriptions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch entity descriptions';
      })
      .addCase(syncEntityDescriptions.pending, (state) => {
        state.syncing = true;
      })
      .addCase(syncEntityDescriptions.fulfilled, (state) => {
        state.syncing = false;
      })
      .addCase(syncEntityDescriptions.rejected, (state) => {
        state.syncing = false;
      })
      .addCase(saveEntityDescriptions.fulfilled, (state, action) => {
        const { type, updates } = action.meta.arg;
        // Apply saved values back into entityTypes
        for (const { paperlessId, description } of updates) {
          const et = state.entityTypes.find(e => e.type === type);
          if (et) {
            const entity = et.entities.find(e => e.paperlessId === paperlessId);
            if (entity) entity.description = description;
          }
          delete state.pendingDescriptions[`${type}:${paperlessId}`];
        }
      });
  },
});

export const { setPendingDescription, clearPendingForType } = entityDescriptionsSlice.actions;
export default entityDescriptionsSlice.reducer;
