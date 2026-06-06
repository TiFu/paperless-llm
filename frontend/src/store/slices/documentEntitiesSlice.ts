import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { EntityValueType } from '../../services/api/generated/models/EntityValueType';
import { EntityValue } from '../../services/api/generated/models/EntityValue';
import { apiClient } from '../../services/api/api';
import type { RootState } from '../store';

interface EntityTypeState {
  items: EntityValue[];
  loaded: boolean;
  loading: boolean;
}

interface DocumentEntitiesState {
  byType: Partial<Record<EntityValueType, EntityTypeState>>;
}

const initialState: DocumentEntitiesState = {
  byType: {},
};

export const fetchEntityValues = createAsyncThunk<
  { type: EntityValueType; items: EntityValue[] },
  EntityValueType,
  { state: RootState }
>(
  'documentEntities/fetchEntityValues',
  async (type) => {
    const response = await apiClient.fetchEntityValues(type);
    return { type, items: response.items };
  },
  {
    condition: (type, { getState }) => {
      const typeState = getState().documentEntities.byType[type];
      return !typeState?.loaded && !typeState?.loading;
    },
  },
);

const documentEntitiesSlice = createSlice({
  name: 'documentEntities',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchEntityValues.pending, (state, action) => {
        const type = action.meta.arg;
        state.byType[type] = { items: [], loaded: false, loading: true };
      })
      .addCase(fetchEntityValues.fulfilled, (state, action) => {
        const { type, items } = action.payload;
        state.byType[type] = { items, loaded: true, loading: false };
      })
      .addCase(fetchEntityValues.rejected, (state, action) => {
        const type = action.meta.arg;
        const typeState = state.byType[type];
        if (typeState) {
          typeState.loading = false;
        }
      });
  },
});

export default documentEntitiesSlice.reducer;
