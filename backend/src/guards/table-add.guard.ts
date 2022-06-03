import { CanActivate, ExecutionContext, forwardRef, Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithCognitoInfo } from '../authorization';
import { UserAccessService } from '../entities/user-access/user-access.service';
import { Messages } from '../exceptions/text/messages';
import { getMasterPwd } from '../helpers';
import { buildBadRequestException, buildForbiddenException } from './utils';
import { validateUuidByRegex } from './utils/validate-uuid-by-regex';

@Injectable()
export class TableAddGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => UserAccessService))
    private readonly userAccessService: UserAccessService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return new Promise(async (resolve, reject) => {
      const request: IRequestWithCognitoInfo = context.switchToHttp().getRequest();
      const cognitoUserName = request.decoded.sub;
      const connectionId: string = request.params?.slug;
      const tableName: string = request.query?.tableName;
      const masterPwd = getMasterPwd(request);
      if (!tableName) {
        reject(buildBadRequestException(Messages.TABLE_NAME_MISSING));
        return;
      }
      if (!connectionId || !validateUuidByRegex(connectionId)) {
        reject(buildBadRequestException(Messages.CONNECTION_ID_MISSING));
        return;
      }
      let userTableAdd = false;
      try {
        userTableAdd = await this.userAccessService.checkTableAdd(cognitoUserName, connectionId, tableName, masterPwd);
      } catch (e) {
        reject(e);
        return;
      }
      if (userTableAdd) {
        resolve(userTableAdd);
        return;
      } else {
        reject(buildForbiddenException(Messages.DONT_HAVE_PERMISSIONS));
        return;
      }
    });
  }
}