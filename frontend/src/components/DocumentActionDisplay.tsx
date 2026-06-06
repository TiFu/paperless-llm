import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEntityValues } from '../store/slices/documentEntitiesSlice';
import { EntityValueType } from '../services/api/generated/models/EntityValueType';
import { ProposedActionFieldType } from '../services/api/generated/models/ProposedActionFieldType';
import { ApprovalItemProposedActionsInner } from '../services/api/generated/models/ApprovalItemProposedActionsInner';
import {
  StringActionDisplay,
  StringActionEditor,
  DateActionDisplay,
  DateActionEditor,
  EnumActionDisplay,
  EnumActionEditor,
  MultipleEnumActionDisplay,
  MultipleEnumActionEditor,
} from './action_display';

interface DocumentActionDisplayProps {
  action: ApprovalItemProposedActionsInner;
  value: string | null;
  editable: boolean;
  onChange?: (newValue: string) => void;
}

const fieldTypeToEntityType: Partial<Record<ProposedActionFieldType, EntityValueType>> = {
  [ProposedActionFieldType.tag]: EntityValueType.tag,
  [ProposedActionFieldType.correspondent]: EntityValueType.correspondent,
  [ProposedActionFieldType.document_type]: EntityValueType.document_type,
};

export const DocumentActionDisplay: React.FC<DocumentActionDisplayProps> = ({
  action,
  value,
  editable,
  onChange,
}) => {
  const dispatch = useAppDispatch();
  const { fieldType, isMultiple } = action;

  const entityType = fieldTypeToEntityType[fieldType as ProposedActionFieldType] ?? null;
  const entityItems = useAppSelector((state) =>
    entityType ? (state.documentEntities.byType[entityType]?.items ?? []) : []
  );

  useEffect(() => {
    if (entityType) {
      dispatch(fetchEntityValues(entityType));
    }
  }, [entityType, dispatch]);

  const viewProps = { value, entityItems };
  const editorProps = {
    action,
    value,
    editable: true as const,
    entityItems,
    onChange: onChange!,
  };

  switch (fieldType) {
    case ProposedActionFieldType.string:
      return editable ? (
        <StringActionEditor {...editorProps} />
      ) : (
        <StringActionDisplay {...viewProps} />
      );
    case ProposedActionFieldType.date:
      return editable ? (
        <DateActionEditor {...editorProps} />
      ) : (
        <DateActionDisplay {...viewProps} />
      );
    case ProposedActionFieldType.tag:
    case ProposedActionFieldType.correspondent:
    case ProposedActionFieldType.document_type:
      return isMultiple ? (
        editable ? (
          <MultipleEnumActionEditor {...editorProps} />
        ) : (
          <MultipleEnumActionDisplay {...viewProps} />
        )
      ) : editable ? (
        <EnumActionEditor {...editorProps} />
      ) : (
        <EnumActionDisplay {...viewProps} />
      );
    default:
      return editable ? (
        <StringActionEditor {...editorProps} />
      ) : (
        <StringActionDisplay {...viewProps} />
      );
  }
};
