import { configureStore } from '@reduxjs/toolkit';
import statsReducer from './slices/statsSlice';
import queueReducer from './slices/queueSlice';
import jobsReducer from './slices/jobsSlice';
import approvalsReducer from './slices/approvalsSlice';
import falloutsReducer from './slices/falloutsSlice';
import documentsReducer from './slices/documentsSlice';
import promptsReducer from './slices/promptsSlice';

export const store = configureStore({
  reducer: {
    stats: statsReducer,
    queue: queueReducer,
    jobs: jobsReducer,
    approvals: approvalsReducer,
    fallouts: falloutsReducer,
    documents: documentsReducer,
    prompts: promptsReducer,
  },
  // The generated API client returns class instances; suppress the serializable
  // check warnings rather than forcing conversion everywhere.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
