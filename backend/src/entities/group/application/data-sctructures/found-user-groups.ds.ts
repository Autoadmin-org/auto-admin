import { AccessLevelEnum } from '../../../../enums';

export class FoundUserGroupsDs {
  groups: Array<{
    group: {
      id: string;
      title: string;
      isMain: boolean;
    };
    accessLevel: AccessLevelEnum;
  }>;
  groupsCount: number;
}
