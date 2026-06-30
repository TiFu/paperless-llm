import { DocumentActionFactory } from '../../../../src/domain/actions/DocumentActionFactory.js';
import { TitleUpdateAction } from '../../../../src/domain/actions/TitleUpdateAction.js';
import { TagUpdateAction } from '../../../../src/domain/actions/TagUpdateAction.js';
import { TagRemoveAction } from '../../../../src/domain/actions/TagRemoveAction.js';
import { CorrespondentUpdateAction } from '../../../../src/domain/actions/CorrespondentUpdateAction.js';
import { DocumentTypeUpdateAction } from '../../../../src/domain/actions/DocumentTypeUpdateAction.js';
import { CreatedDateUpdateAction } from '../../../../src/domain/actions/CreatedDateUpdateAction.js';
import { DocumentActionType } from '../../../../src/domain/actions/ActionType.js';

function row(actionType: DocumentActionType, overrides: Record<string, unknown> = {}) {
  return {
    id: 'action-1',
    job_id: 'job-1',
    action_type: actionType,
    old_value: 'old',
    new_value: 'new',
    ...overrides,
  };
}

describe('DocumentActionFactory.fromDb', () => {
  it.each([
    [DocumentActionType.UPDATE_TITLE, TitleUpdateAction],
    [DocumentActionType.UPDATE_TAGS, TagUpdateAction],
    [DocumentActionType.UPDATE_CORRESPONDENT, CorrespondentUpdateAction],
    [DocumentActionType.UPDATE_DOCUMENT_TYPE, DocumentTypeUpdateAction],
    [DocumentActionType.UPDATE_CREATED_DATE, CreatedDateUpdateAction],
    [DocumentActionType.REMOVE_TAGS, TagRemoveAction],
  ])('maps %s to %p with matching fields', (actionType, ExpectedClass) => {
    const action = DocumentActionFactory.fromDb(row(actionType));

    expect(action).toBeInstanceOf(ExpectedClass);
    expect(action.id).toBe('action-1');
    expect(action.jobId).toBe('job-1');
    expect(action.actionType).toBe(actionType);
    expect(action.oldValue).toBe('old');
    expect(action.newValue).toBe('new');
  });

  it('throws for an unknown action type', () => {
    expect(() => DocumentActionFactory.fromDb(row('not_a_real_type' as DocumentActionType))).toThrow(
      /Unknown action type/,
    );
  });

  describe('cloneWithNewValue', () => {
    it('produces a new action of the same type with only newValue changed', () => {
      const original = DocumentActionFactory.fromDb(row(DocumentActionType.UPDATE_TITLE));
      const clone = DocumentActionFactory.cloneWithNewValue(original, 'updated title');

      expect(clone).toBeInstanceOf(TitleUpdateAction);
      expect(clone.id).toBe(original.id);
      expect(clone.jobId).toBe(original.jobId);
      expect(clone.oldValue).toBe(original.oldValue);
      expect(clone.newValue).toBe('updated title');
    });
  });
});

describe('action apply() behavior', () => {
  it('TitleUpdateAction.apply sets the title when newValue is present', () => {
    const action = new TitleUpdateAction('a1', 'job-1', 'Old Title', 'New Title');
    expect(action.apply({} as never)).toEqual({ title: 'New Title' });
  });

  it('TitleUpdateAction.apply is a no-op when newValue is empty', () => {
    const action = new TitleUpdateAction('a1', 'job-1', 'Old Title', '');
    expect(action.apply({} as never)).toEqual({});
  });

  it('TagUpdateAction.apply parses the JSON-encoded tag array', () => {
    const action = TagUpdateAction.create('job-1', ['invoice', 'receipt'], ['invoice']);
    expect(action.apply({} as never)).toEqual({ tags: ['invoice', 'receipt'] });
  });
});
