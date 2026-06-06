import { ApprovalItemProposedActionsInner, EntityValue } from '@/services/api/generated';

export interface ActionViewProps {
  value: string | null;
  entityItems?: EntityValue[];
}

export interface ActionDisplayProps {
  action: ApprovalItemProposedActionsInner;
  value: string | null;
  editable: boolean;
  entityItems?: EntityValue[];
  onChange: (newValue: string) => void;
}
