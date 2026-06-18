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
  Chip,
  CircularProgress,
} from '@mui/material';
import { DocumentListItem } from '../services/api/generated/models/DocumentListItem';

const CONTENT_PREVIEW_LENGTH = 150;

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trimEnd() + '…';
}

interface DocumentListProps {
  documents: DocumentListItem[];
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
      onSelectionChange(documents.filter((doc) => !doc.inProgress).map((doc) => doc.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (doc: DocumentListItem) => {
    if (doc.inProgress) return;
    const isSelected = selectedIds.includes(doc.id);
    if (isSelected) {
      onSelectionChange(selectedIds.filter((id) => id !== doc.id));
    } else {
      onSelectionChange([...selectedIds, doc.id]);
    }
  };

  const selectableCount = documents.filter((doc) => !doc.inProgress).length;
  const isAllSelected = selectableCount > 0 && selectedIds.length === selectableCount;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < selectableCount;

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
              <TableCell>Status</TableCell>
              <TableCell>Title</TableCell>
              <TableCell sx={{ maxWidth: 400 }}>Content</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => {
              const docId = doc.id;
              const isSelected = selectedIds.includes(docId);
              return (
                <TableRow
                  key={docId}
                  hover={!doc.inProgress}
                  onClick={() => handleSelectOne(doc)}
                  selected={isSelected}
                  sx={{ cursor: doc.inProgress ? 'default' : 'pointer', opacity: doc.inProgress ? 0.6 : 1 }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={isSelected} disabled={doc.inProgress} />
                  </TableCell>
                  <TableCell>{docId}</TableCell>
                  <TableCell>
                    {doc.inProgress && <Chip size="small" color="warning" label="In progress" />}
                  </TableCell>
                  <TableCell>{doc.title || '(No Title)'}</TableCell>
                  <TableCell sx={{ maxWidth: 400 }}>
                    <Typography variant="body2" color="text.secondary">
                      {truncateContent(doc.content, CONTENT_PREVIEW_LENGTH)}
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
