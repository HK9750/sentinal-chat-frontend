export type CommandStatus = 'PENDING' | 'EXECUTED' | 'FAILED' | 'UNDONE';

export type CommandType =
  | 'DELETE_MESSAGE'
  | 'EDIT_MESSAGE'
  | 'REACT_MESSAGE'
  | 'PIN_MESSAGE'
  | 'UNPIN_MESSAGE'
  | 'CLEAR_CHAT';

export interface CommandResult {
  command_id: string;
  type: CommandType;
  conversation_id?: string | null;
  status: CommandStatus;
  undone_at?: string | null;
  executed_at?: string | null;
}
