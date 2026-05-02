import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  Box,
  Typography,
} from '@mui/material';
import { AuditEntry } from '../types/api';

interface AuditLogTableProps {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number, newLimit: number) => void;
  onDocumentFilter: (documentId: string) => void;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  entries,
  total,
  limit,
  offset,
  onPageChange,
  onDocumentFilter,
}) => {
  const [documentIdFilter, setDocumentIdFilter] = React.useState('');
  const [filterTimeout, setFilterTimeout] = React.useState<NodeJS.Timeout | null>(null);

  const handleDocumentFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDocumentIdFilter(value);

    // Debounce the filter
    if (filterTimeout) {
      clearTimeout(filterTimeout);
    }

    const timeout = setTimeout(() => {
      onDocumentFilter(value);
    }, 500);

    setFilterTimeout(timeout);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    onPageChange(newPage * limit, limit);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    onPageChange(0, newLimit);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDetails = (details: Record<string, unknown>) => {
    return JSON.stringify(details, null, 2);
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Filter by Document ID"
          value={documentIdFilter}
          onChange={handleDocumentFilterChange}
          fullWidth
        />
      </Box>

      {entries.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No audit entries found.
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Document ID</TableCell>
                  <TableCell>Document System</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.timestamp)}</TableCell>
                    <TableCell>{entry.documentId}</TableCell>
                    <TableCell>{entry.documentSystem}</TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxWidth: '400px',
                        }}
                      >
                        {formatDetails(entry.details)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={Math.floor(offset / limit)}
            onPageChange={handleChangePage}
            rowsPerPage={limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
      )}
    </Box>
  );
};
