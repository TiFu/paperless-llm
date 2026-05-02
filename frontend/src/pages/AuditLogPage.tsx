import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { AuditLogTable } from '../components/AuditLogTable';
import { apiClient } from '../services/api';
import { AuditEntry } from '../types/api';

export const AuditLogPage: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [documentIdFilter, setDocumentIdFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchAuditLog(
        documentIdFilter || undefined,
        limit,
        offset
      );
      setEntries(response.entries);
      setTotal(response.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset, documentIdFilter]);

  const handlePageChange = (newOffset: number, newLimit: number) => {
    setOffset(newOffset);
    setLimit(newLimit);
  };

  const handleDocumentFilter = (documentId: string) => {
    setDocumentIdFilter(documentId);
    setOffset(0); // Reset to first page when filtering
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Audit Log
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && entries.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <AuditLogTable
          entries={entries}
          total={total}
          limit={limit}
          offset={offset}
          onPageChange={handlePageChange}
          onDocumentFilter={handleDocumentFilter}
        />
      )}
    </Container>
  );
};
