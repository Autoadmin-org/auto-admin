import { UserActionEntity } from '../user-action.entity';
import { CreatedUserActionDs } from '../application/data-sctructures/created-user-action.ds';

export function buildCreatedUserActionDs(userAction: UserActionEntity): CreatedUserActionDs {
  const { createdAt, message, id, mail_sent } = userAction;
  return {
    createdAt: createdAt,
    id: id,
    mail_sent: mail_sent,
    message: message,
  };
}
