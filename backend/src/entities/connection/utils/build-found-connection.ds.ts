import { ConnectionEntity } from '../connection.entity';
import {
  FoundAgentConnectionsDs,
  FoundDirectConnectionsDs,
  FoundDirectConnectionsNonePermissionDs,
} from '../application/data-structures/found-connections.ds';

export function buildFoundConnectionDs(
  connection: ConnectionEntity,
): FoundDirectConnectionsDs | FoundAgentConnectionsDs | FoundDirectConnectionsNonePermissionDs {
  return {
    author: connection.author?.id,
    azure_encryption: connection.azure_encryption,
    cert: connection.cert,
    createdAt: connection.createdAt,
    database: connection.database,
    host: connection.host,
    id: connection.id,
    masterEncryption: connection.masterEncryption,
    port: connection.port,
    schema: connection.schema,
    sid: connection.sid,
    ssh: connection.ssh,
    sshHost: connection.sshHost,
    sshPort: connection.sshPort,
    ssl: connection.ssl,
    title: connection.title,
    token: connection.agent?.token,
    type: connection.type,
    updatedAt: connection.updatedAt,
    username: connection.username,
  };
}