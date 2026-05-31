import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Typography,
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import { Document } from '../services/api/generated/models/Document';

interface DocumentListProps {
  documents: Document[];
  selectedIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedIds,
  onSelectionChange,
  onLoadMore,
  loadingMore = false,
}) => {
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange(documents.map((doc) => doc.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (documentId: number) => {
    const isSelected = selectedIds.includes(documentId);
    if (isSelected) {
      onSelectionChange(selectedIds.filter((id) => id !== documentId));
    } else {
      onSelectionChange([...selectedIds, documentId]);
    }
  };

  const isAllSelected = documents.length > 0 && selectedIds.length === documents.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < documents.length;

  if (documents.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No documents found with the specified tag.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => {
              const docId = doc.id;
              const isSelected = selectedIds.includes(docId);
              return (
                <TableRow
                  key={docId}
                  hover
                  onClick={() => handleSelectOne(docId)}
                  selected={isSelected}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={isSelected} />
                  </TableCell>
                  <TableCell>{docId}</TableCell>
                  <TableCell>{doc.title || '(No Title)'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {doc.content}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      {onLoadMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onLoadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </Box>
      )}
    </>
  );
};
