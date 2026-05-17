import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function fetchDocumentFields(): Promise<string[]> {
  // This should match the backend's DOCUMENT_FIELDS
  const response = await axios.get<string[]>(`${API_BASE_URL}/api/jobs/fields`);
  return response.data;
}
