import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Injectable,
  Param,
  Post,
  Put,
  Query,
  Req,
  Scope,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AmplitudeEventTypeEnum, ConnectionTypeEnum } from '../../enums';
import { CreateConnectionDto, CreateGroupInConnectionDto, UpdateMasterPasswordDto } from './dto';
import { GroupEntity } from '../group/group.entity';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { IComplexPermission } from '../permission/permission.interface';
import { IRequestWithCognitoInfo } from '../../authorization';
import { Messages } from '../../exceptions/text/messages';
import { SentryInterceptor } from '../../interceptors';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  findGclidCookieValue,
  getCognitoUserName,
  getMasterPwd,
  isConnectionEntityAgent,
  isConnectionTypeAgent,
  toPrettyErrorsMsg,
} from '../../helpers';
import validator from 'validator';
import { ITestConnectResult } from '../../dal/shared/dao-interface';
import { ConnectionEditGuard, ConnectionReadGuard } from '../../guards';
import { UseCaseType } from '../../common/data-injection.tokens';
import { FindUserDs } from '../user/application/data-structures/find-user.ds';
import {
  ICreateConnection,
  ICreateGroupInConnection,
  IDeleteConnection,
  IDeleteGroupInConnection,
  IFindConnections,
  IFindOneConnection,
  IFindUsersInConnection,
  IGetPermissionsForGroupInConnection,
  IGetUserGroupsInConnection,
  IRefreshConnectionAgentToken,
  IRestoreConnection,
  ITestConnection,
  IUpdateConnection,
  IUpdateMasterPassword,
  IValidateConnectionToken,
} from './use-cases/use-cases.interfaces';
import { FoundConnectionsDs } from './application/data-structures/found-connections.ds';
import { FindOneConnectionDs } from './application/data-structures/find-one-connection.ds';
import { FoundOneConnectionDs } from './application/data-structures/found-one-connection.ds';
import { FoundUserDs } from '../user/application/data-structures/found-user.ds';
import { CreateConnectionDs } from './application/data-structures/create-connection.ds';
import { CreatedConnectionDs } from './application/data-structures/created-connection.ds';
import { UpdateConnectionDs } from './application/data-structures/update-connection.ds';
import { DeleteConnectionDs } from './application/data-structures/delete-connection.ds';
import { DeleteGroupInConnectionDs } from './application/data-structures/delete-group-in-connection.ds';
import { CreateGroupInConnectionDs } from './application/data-structures/create-group-in-connection.ds';
import { GetGroupsInConnectionDs } from './application/data-structures/get-groups-in-connection.ds';
import { FoundUserGroupsInConnectionDs } from './application/data-structures/found-user-groups-in-connection.ds';
import { GetPermissionsInConnectionDs } from './application/data-structures/get-permissions-in-connection.ds';
import { UpdateMasterPasswordDs } from './application/data-structures/update-master-password.ds';
import { AmplitudeService } from '../amplitude/amplitude.service';
import { processExceptionMessage } from '../../exceptions/utils/process-exception-message';
import { isTestConnectionById, isTestConnectionUtil } from './utils/is-test-connection-util';
import { RestoredConnectionDs } from './application/data-structures/restored-connection.ds';

@ApiBearerAuth()
@ApiTags('connections')
@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable({ scope: Scope.REQUEST })
export class ConnectionController {
  constructor(
    @Inject(UseCaseType.FIND_CONNECTIONS)
    private readonly findConnectionsUseCase: IFindConnections,
    @Inject(UseCaseType.FIND_CONNECTION)
    private readonly findOneConnectionUseCase: IFindOneConnection,
    @Inject(UseCaseType.FIND_USERS_IN_CONNECTION)
    private readonly findAllUsersInConnectionUseCase: IFindUsersInConnection,
    @Inject(UseCaseType.CREATE_CONNECTION)
    private readonly createConnectionUseCase: ICreateConnection,
    @Inject(UseCaseType.UPDATE_CONNECTION)
    private readonly updateConnectionUseCase: IUpdateConnection,
    @Inject(UseCaseType.DELETE_CONNECTION)
    private readonly deleteConnectionUseCase: IDeleteConnection,
    @Inject(UseCaseType.DELETE_GROUP_FROM_CONNECTION)
    private readonly deleteGroupInConnectionUseCase: IDeleteGroupInConnection,
    @Inject(UseCaseType.CREATE_GROUP_IN_CONNECTION)
    private readonly createGroupInConnectionUseCase: ICreateGroupInConnection,
    @Inject(UseCaseType.GET_USER_GROUPS_IN_CONNECTION)
    private readonly getUserGroupsInConnectionUseCase: IGetUserGroupsInConnection,
    @Inject(UseCaseType.GET_PERMISSIONS_FOR_GROUP_IN_CONNECTION)
    private readonly getPermissionsForGroupInConnectionUseCase: IGetPermissionsForGroupInConnection,
    @Inject(UseCaseType.GET_USER_PERMISSIONS_FOR_GROUP_IN_CONNECTION)
    private readonly getUserPermissionsForGroupInConnectionUseCase: IGetPermissionsForGroupInConnection,
    @Inject(UseCaseType.TEST_CONNECTION_USE_CASE)
    private readonly testConnectionUseCase: ITestConnection,
    @Inject(UseCaseType.UPDATE_CONNECTION_MASTER_PASSWORD)
    private readonly updateConnectionMasterPasswordUseCase: IUpdateMasterPassword,
    @Inject(UseCaseType.RESTORE_CONNECTION)
    private readonly restoreConnectionUseCase: IRestoreConnection,
    @Inject(UseCaseType.VALIDATE_CONNECTION_TOKEN)
    private readonly validateConnectionTokenUseCase: IValidateConnectionToken,
    @Inject(UseCaseType.REFRESH_CONNECTION_AGENT_TOKEN)
    private readonly refreshConnectionAgentTokenUseCase: IRefreshConnectionAgentToken,
    private readonly amplitudeService: AmplitudeService,
  ) {}

  @ApiOperation({ summary: 'Get all connections' })
  @ApiResponse({ status: 200, description: 'Return all connections.' })
  @Get('/connections')
  async findAll(@Req() request: IRequestWithCognitoInfo): Promise<FoundConnectionsDs> {
    console.log(`findAll triggered in connection.controller ->: ${new Date().toISOString()}`);

    const cognitoUserName = getCognitoUserName(request);
    const glidCookieValue = findGclidCookieValue(request);
    const userData: FindUserDs = {
      id: cognitoUserName,
      gclidValue: glidCookieValue,
    };
    return await this.findConnectionsUseCase.execute(userData);
  }

  @ApiOperation({ summary: 'Get users in connection' })
  @ApiResponse({ status: 200, description: 'Return all connection users' })
  @UseGuards(ConnectionReadGuard)
  @Get('/connection/users/:slug')
  async findAllUsers(@Req() request: IRequestWithCognitoInfo, @Param() params): Promise<Array<FoundUserDs>> {
    const cognitoUserName = getCognitoUserName(request);
    const connectionId = params.slug;
    try {
      return await this.findAllUsersInConnectionUseCase.execute(connectionId);
    } catch (e) {
      throw e;
    } finally {
      const isConnectionTest = await isTestConnectionById(connectionId);
      await this.amplitudeService.formAndSendLogRecord(
        isConnectionTest
          ? AmplitudeEventTypeEnum.connectionUsersReceivedTest
          : AmplitudeEventTypeEnum.connectionUsersReceived,
        cognitoUserName,
      );
    }
  }

  @ApiOperation({ summary: 'Get connection by id' })
  @Get('/connection/one/:slug')
  @UseGuards(ConnectionReadGuard)
  async findOne(@Param() params, @Req() request: IRequestWithCognitoInfo): Promise<FoundOneConnectionDs> {
    const cognitoUserName = getCognitoUserName(request);
    const id = params.slug;
    const masterPwd = getMasterPwd(request);
    try {
      const findOneConnectionInput: FindOneConnectionDs = {
        connectionId: id,
        masterPwd: masterPwd,
        cognitoUserName: cognitoUserName,
      };
      return await this.findOneConnectionUseCase.execute(findOneConnectionInput);
    } catch (e) {
      throw e;
    } finally {
      const isTest = await isTestConnectionById(id);
      await this.amplitudeService.formAndSendLogRecord(
        isTest ? AmplitudeEventTypeEnum.connectionReceivedTest : AmplitudeEventTypeEnum.connectionReceived,
        cognitoUserName,
      );
    }
  }

  @ApiOperation({ summary: 'Create connection' })
  @ApiBody({ type: CreateConnectionDto })
  @ApiResponse({
    status: 201,
    description: 'The connection has been successfully created.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post('/connection')
  async create(
    @Req() request: IRequestWithCognitoInfo,
    @Body('title') title: string,
    @Body('masterEncryption') masterEncryption: boolean,
    @Body('type') type: ConnectionTypeEnum,
    @Body('host') host: string,
    @Body('port') port: number,
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('database') database: string,
    @Body('schema') schema: string,
    @Body('sid') sid: string,
    @Body('ssh') ssh: boolean,
    @Body('privateSSHKey') privateSSHKey: string,
    @Body('sshHost') sshHost: string,
    @Body('sshPort') sshPort: number,
    @Body('sshUsername') sshUsername: string,
    @Body('ssl') ssl: boolean,
    @Body('cert') cert: string,
    @Body('azure_encryption') azure_encryption: boolean,
  ): Promise<CreatedConnectionDs> {
    const cognitoUserName = getCognitoUserName(request);
    const masterPwd = getMasterPwd(request);
    if (!password && !isConnectionTypeAgent(type)) {
      throw new HttpException(
        {
          message: Messages.PASSWORD_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (ssh && !privateSSHKey) {
      throw new HttpException(
        {
          message: Messages.SSH_PASSWORD_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const createConnectionDs: CreateConnectionDs = {
      connection_parameters: {
        azure_encryption: azure_encryption,
        cert: cert,
        database: database,
        host: host,
        masterEncryption: masterEncryption,
        password: password,
        port: port,
        privateSSHKey: privateSSHKey,
        schema: schema,
        sid: sid,
        ssh: ssh,
        sshHost: sshHost,
        sshPort: sshPort,
        sshUsername: sshUsername,
        ssl: ssl,
        title: title,
        type: type,
        username: username,
      },
      creation_info: {
        authorId: cognitoUserName,
        masterPwd: masterPwd,
      },
    };
    return await this.createConnectionUseCase.execute(createConnectionDs);
  }

  @ApiOperation({ summary: 'Update connection' })
  @ApiResponse({
    status: 201,
    description: 'The connection has been successfully updated.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/:slug')
  async update(
    @Req() request: IRequestWithCognitoInfo,
    @Body('title') title: string,
    @Body('masterEncryption') masterEncryption: boolean,
    @Body('type') type: ConnectionTypeEnum,
    @Body('host') host: string,
    @Body('port') port: number,
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('database') database: string,
    @Body('schema') schema: string,
    @Body('sid') sid: string,
    @Body('ssh') ssh: boolean,
    @Body('privateSSHKey') privateSSHKey: string,
    @Body('sshHost') sshHost: string,
    @Body('sshPort') sshPort: number,
    @Body('sshUsername') sshUsername: string,
    @Body('ssl') ssl: boolean,
    @Body('cert') cert: string,
    @Body('azure_encryption') azure_encryption: boolean,
    @Param() params,
  ): Promise<{ connection: Omit<CreatedConnectionDs, 'groups'> }> {
    const cognitoUserName = getCognitoUserName(request);
    const connectionId = params.slug;
    const masterPwd = getMasterPwd(request);
    const errors = [];

    if (masterEncryption && !masterPwd) {
      errors.push(Messages.MASTER_PASSWORD_REQUIRED);
    }
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const connectionData: UpdateConnectionDs = {
      connection_parameters: {
        azure_encryption: azure_encryption,
        cert: cert,
        database: database,
        host: host,
        masterEncryption: masterEncryption,
        password: password,
        port: port,
        privateSSHKey: privateSSHKey,
        schema: schema,
        sid: sid,
        ssh: ssh,
        sshHost: sshHost,
        sshPort: sshPort,
        sshUsername: sshUsername,
        ssl: ssl,
        title: title,
        type: type,
        username: username,
      },
      update_info: {
        authorId: cognitoUserName,
        connectionId: connectionId,
        masterPwd: masterPwd,
      },
    };

    const updatedConnection = await this.updateConnectionUseCase.execute(connectionData);
    return { connection: updatedConnection };
  }

  @ApiOperation({ summary: 'Delete connection' })
  @ApiResponse({
    status: 201,
    description: 'The connection has been successfully deleted.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/delete/:slug')
  async delete(
    @Param() params,
    @Req() request: IRequestWithCognitoInfo,
    @Body('reason') reason: string,
    @Body('message') message: string,
  ): Promise<CreatedConnectionDs> {
    const cognitoUserName = getCognitoUserName(request);
    const id = params.slug;
    const masterPwd = getMasterPwd(request);
    const inputData: DeleteConnectionDs = {
      connectionId: id,
      cognitoUserName: cognitoUserName,
      masterPwd: masterPwd,
    };
    const deleteResult = await this.deleteConnectionUseCase.execute(inputData);
    const isTest = isTestConnectionUtil(deleteResult);
    await this.amplitudeService.formAndSendLogRecord(
      isTest ? AmplitudeEventTypeEnum.connectionDeletedTest : AmplitudeEventTypeEnum.connectionDeleted,
      inputData.cognitoUserName,
      {
        reason: reason,
        message: message,
      },
    );
    return deleteResult;
  }

  @ApiOperation({ summary: 'Delete group from connection by id' })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/group/delete/:slug')
  async deleteGroupFromConnection(
    @Req() request: IRequestWithCognitoInfo,
    @Param() params,
    @Body('groupId') groupId: string,
  ): Promise<Omit<GroupEntity, 'connection'>> {
    const cognitoUserName = getCognitoUserName(request);
    const connectionId = params.slug;
    if (!groupId) {
      throw new HttpException(
        {
          message: Messages.GROUP_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: DeleteGroupInConnectionDs = {
      groupId: groupId,
      connectionId: connectionId,
      cognitoUserName: cognitoUserName,
    };
    return await this.deleteGroupInConnectionUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Create group in connection' })
  @ApiBody({ type: CreateGroupInConnectionDto })
  @UseGuards(ConnectionEditGuard)
  @Post('/connection/group/:slug')
  async createGroupInConnection(
    @Param() params,
    @Body('title') title: string,
    @Body('permissions') permissions: any,
    @Body('users') users: any,
    @Req() request: IRequestWithCognitoInfo,
  ): Promise<Omit<GroupEntity, 'connection'>> {
    const connectionId = params.slug;
    const cognitoUserName = getCognitoUserName(request);
    if (!title) {
      throw new HttpException(
        {
          message: Messages.GROUP_TITLE_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: CreateGroupInConnectionDs = {
      group_parameters: {
        title: title,
        connectionId: connectionId,
      },
      creation_info: {
        cognitoUserName: cognitoUserName,
      },
    };
    return await this.createGroupInConnectionUseCase.execute(inputData);
  }

  @ApiOperation({ summary: 'Get all groups in this connection' })
  @Get('/connection/groups/:slug')
  async getGroupsInConnection(
    @Param() params,
    @Req() request: IRequestWithCognitoInfo,
  ): Promise<Array<FoundUserGroupsInConnectionDs>> {
    const cognitoUserName = getCognitoUserName(request);
    const connectionId = params.slug;
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: GetGroupsInConnectionDs = {
      connectionId: connectionId,
      cognitoUserName: cognitoUserName,
    };
    return await this.getUserGroupsInConnectionUseCase.execute(inputData);
  }

  @ApiOperation({
    summary: 'Get all permissions for current connection, group and tables',
  })
  @Get('/connection/permissions')
  async getPermissionsForGroupInConnection(
    @Query('connectionId') connectionId: string,
    @Query('groupId') groupId: string,
    @Req() request: IRequestWithCognitoInfo,
  ): Promise<IComplexPermission> {
    const cognitoUserName = getCognitoUserName(request);
    if (!connectionId || !groupId) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const masterPwd = getMasterPwd(request);
    const inputData: GetPermissionsInConnectionDs = {
      groupId: groupId,
      connectionId: connectionId,
      masterPwd: masterPwd,
      cognitoUserName: cognitoUserName,
    };
    return await this.getPermissionsForGroupInConnectionUseCase.execute(inputData);
  }

  @ApiOperation({
    summary: 'Get all user permissions for current connection, group and tables',
  })
  @Get('/connection/user/permissions')
  async getUserPermissionsForGroupInConnection(
    @Query('connectionId') connectionId: string,
    @Query('groupId') groupId: string,
    @Req() request: IRequestWithCognitoInfo,
  ): Promise<IComplexPermission> {
    const cognitoUserName = getCognitoUserName(request);
    if (!connectionId || !groupId) {
      throw new HttpException(
        {
          message: Messages.PARAMETER_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const masterPwd = getMasterPwd(request);
    const inputData: GetPermissionsInConnectionDs = {
      groupId: groupId,
      connectionId: connectionId,
      masterPwd: masterPwd,
      cognitoUserName: cognitoUserName,
    };
    return await this.getUserPermissionsForGroupInConnectionUseCase.execute(inputData);
  }

  @ApiBody({ type: CreateConnectionDto })
  @ApiOperation({ summary: 'Test connection' })
  @Post('/connection/test/')
  async testConnection(
    @Req() request: IRequestWithCognitoInfo,
    @Body('title') title: string,
    @Body('masterEncryption') masterEncryption: boolean,
    @Body('type') type: ConnectionTypeEnum,
    @Body('host') host: string,
    @Body('port') port: number,
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('database') database: string,
    @Body('schema') schema: string,
    @Body('sid') sid: string,
    @Body('ssh') ssh: boolean,
    @Body('privateSSHKey') privateSSHKey: string,
    @Body('sshHost') sshHost: string,
    @Body('sshPort') sshPort: number,
    @Body('sshUsername') sshUsername: string,
    @Body('ssl') ssl: boolean,
    @Body('cert') cert: string,
    @Body('azure_encryption') azure_encryption: boolean,
    @Param() params,
    @Query('connectionId') connectionId: string,
  ): Promise<ITestConnectResult> {
    const masterPwd = getMasterPwd(request);
    const cognitoUserName = getCognitoUserName(request);
    const inputData: UpdateConnectionDs = {
      connection_parameters: {
        azure_encryption: azure_encryption,
        cert: cert,
        database: database,
        host: host,
        masterEncryption: masterEncryption,
        password: password,
        port: port,
        privateSSHKey: privateSSHKey,
        schema: schema,
        sid: sid,
        ssh: ssh,
        sshHost: sshHost,
        sshPort: sshPort,
        sshUsername: sshUsername,
        ssl: ssl,
        title: title,
        type: type,
        username: username,
      },
      update_info: {
        authorId: cognitoUserName,
        connectionId: connectionId,
        masterPwd: masterPwd,
      },
    };
    const errors = this.validateParameters(inputData.connection_parameters);
    if (errors.length > 0) {
      return {
        result: false,
        message: toPrettyErrorsMsg(errors),
      };
    }
    const result = await this.testConnectionUseCase.execute(inputData);
    result.message = processExceptionMessage(result.message);
    return result;
  }

  @ApiBody({ type: UpdateMasterPasswordDto })
  @ApiOperation({ summary: 'Update connection master pwd' })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/encryption/update/:slug')
  async updateConnectionMasterPwd(
    @Req() request: IRequestWithCognitoInfo,
    @Param() params,
    @Body('oldMasterPwd') oldMasterPwd: string,
    @Body('newMasterPwd') newMasterPwd: string,
  ): Promise<boolean> {
    const connectionId = params.slug;

    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!oldMasterPwd) {
      throw new HttpException(
        {
          message: Messages.MASTED_OLD_PASSWORD_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!newMasterPwd) {
      throw new HttpException(
        {
          message: Messages.MASTED_NEW_PASSWORD_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: UpdateMasterPasswordDs = {
      connectionId: connectionId,
      newMasterPwd: newMasterPwd,
      oldMasterPwd: oldMasterPwd,
    };
    return await this.updateConnectionMasterPasswordUseCase.execute(inputData);
  }

  @ApiOperation({
    summary: 'Renew connection in case of lost master password ',
  })
  @ApiResponse({
    status: 200,
    description: 'The connection has been successfully restored.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(ConnectionEditGuard)
  @Put('/connection/encryption/restore/:slug')
  async restore(
    @Req() request: IRequestWithCognitoInfo,
    @Body('title') title: string,
    @Body('masterEncryption') masterEncryption: boolean,
    @Body('type') type: string,
    @Body('host') host: string,
    @Body('port') port: number,
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('database') database: string,
    @Body('schema') schema: string,
    @Body('sid') sid: string,
    @Body('ssh') ssh: boolean,
    @Body('privateSSHKey') privateSSHKey: string,
    @Body('sshHost') sshHost: string,
    @Body('sshPort') sshPort: number,
    @Body('sshUsername') sshUsername: string,
    @Body('ssl') ssl: boolean,
    @Body('cert') cert: string,
    @Body('azure_encryption') azure_encryption: boolean,
    @Param() params,
  ): Promise<RestoredConnectionDs> {
    const cognitoUserName = getCognitoUserName(request);
    const connectionId = params.slug;
    const masterPwd = getMasterPwd(request);

    const connectionData: UpdateConnectionDs = {
      connection_parameters: {
        title: title,
        masterEncryption: masterEncryption,
        type: type as ConnectionTypeEnum,
        host: host,
        port: port,
        username: username,
        password: password,
        database: database,
        schema: schema,
        sid: sid,
        ssh: ssh,
        privateSSHKey: privateSSHKey,
        sshHost: sshHost,
        sshPort: sshPort,
        sshUsername: sshUsername,
        ssl: ssl,
        cert: cert,
        azure_encryption: azure_encryption,
      },
      update_info: {
        connectionId: connectionId,
        masterPwd: masterPwd,
        authorId: cognitoUserName,
      },
    };

    const errors = this.validateParameters(connectionData.connection_parameters);

    if (!connectionId) errors.push(Messages.ID_MISSING);

    if (connectionData.connection_parameters.masterEncryption && !masterPwd) {
      errors.push(Messages.MASTER_PASSWORD_REQUIRED);
    }

    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.restoreConnectionUseCase.execute(connectionData);
  }

  @ApiOperation({ summary: 'Check connection token existence' })
  @Get('/connection/token/')
  async validateConnectionAgentToken(@Req() request, @Query('token') token: string): Promise<boolean> {
    if (!token) {
      return false;
    }
    return await this.validateConnectionTokenUseCase.execute(token);
  }

  @ApiOperation({ summary: 'Generate new connection token' })
  @UseGuards(ConnectionEditGuard)
  @Get('/connection/token/refresh/:slug')
  async refreshConnectionAgentToken(
    @Req() request: IRequestWithCognitoInfo,
    @Param() params,
  ): Promise<{ token: string }> {
    const connectionId = params.slug;
    if (!connectionId) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.refreshConnectionAgentTokenUseCase.execute(connectionId);
  }

  private validateParameters = (connectionData: CreateConnectionDto): Array<string> => {
    const errors = [];

    function validateConnectionType(type: string): string {
      return Object.keys(ConnectionTypeEnum).find((key) => key === type);
    }

    if (!connectionData.type) errors.push(Messages.TYPE_MISSING);
    if (!validateConnectionType(connectionData.type)) errors.push(Messages.CONNECTION_TYPE_INVALID);
    if (!isConnectionEntityAgent(connectionData)) {
      if (!connectionData.host) {
        errors.push(Messages.HOST_MISSING);
        return errors;
      }
      if (process.env.NODE_ENV !== 'test' && !connectionData.ssh) {
        if (!validator.isFQDN(connectionData.host) && !validator.isIP(connectionData.host))
          errors.push(Messages.HOST_NAME_INVALID);
      }
      if (connectionData.port < 0 || connectionData.port > 65535 || !connectionData.port)
        errors.push(Messages.PORT_MISSING);
      if (typeof connectionData.port !== 'number') errors.push(Messages.PORT_FORMAT_INCORRECT);
      if (!connectionData.username) errors.push(Messages.USERNAME_MISSING);
      if (!connectionData.database) errors.push(Messages.DATABASE_MISSING);
      if (typeof connectionData.ssh !== 'boolean') errors.push(Messages.SSH_FORMAT_INCORRECT);
      if (connectionData.ssh) {
        if (typeof connectionData.sshPort !== 'number') {
          errors.push(Messages.SSH_PORT_FORMAT_INCORRECT);
        }
        if (!connectionData.sshPort) errors.push(Messages.SSH_PORT_MISSING);
        if (!connectionData.sshUsername) errors.push(Messages.SSH_USERNAME_MISSING);
        if (!connectionData.sshHost) errors.push(Messages.SSH_HOST_MISSING);
      }
    } else {
      if (!connectionData.title) errors.push('Connection title missing');
    }

    return errors;
  };
}
