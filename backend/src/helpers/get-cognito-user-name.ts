import { IRequestWithCognitoInfo } from '../authorization';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { Messages } from '../exceptions/text/messages';
import { HttpStatus } from '@nestjs/common';

export function getCognitoUserName(request: IRequestWithCognitoInfo): string {
  const cognitoUserName = request.decoded.sub;
  if (cognitoUserName) {
    return cognitoUserName;
  } else {
    throw new HttpException(
      {
        message: Messages.COGNITO_USERNAME_MISSING,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
