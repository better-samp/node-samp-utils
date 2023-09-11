import {Buffer} from 'buffer';
import {SmartBuffer} from 'smart-buffer';
import {decodeWin1251Buffer, encodeWin1251Text} from '~/helpers/encoding';

export interface SampFavouriteServer {
  ip: string;
  port: number;
  name: string;
  password: string;
  rconPassword: string;
}

export interface FavouriteListOptions {
  servers?: SampFavouriteServer[];
}

export class FavouriteListError extends Error {
  name = 'FavouriteListError';
}

export class FavouriteList {
  static deserialize(buffer: Buffer): SampFavouriteServer[] {
    const buff = SmartBuffer.fromBuffer(buffer);
    if (!buff.readString(4)) throw new FavouriteListError('this is not USERDATA buffer');
    const version = buff.readUInt32LE();
    if (version !== 1) throw new FavouriteListError(`version ${version} not supported`);
    const serversCount = buff.readUInt32LE();
    const servers: SampFavouriteServer[] = [];
    const readString = () => decodeWin1251Buffer(buff.readBuffer(buff.readUInt32LE()));
    for (let i = 0; i < serversCount; ++i) {
      servers.push({
        ip: readString(),
        port: buff.readUInt32LE(),
        name: readString(),
        password: readString(),
        rconPassword: readString(),
      });
    }
    return servers;
  }

  static serialize(servers: SampFavouriteServer[]): Buffer {
    const buff = new SmartBuffer();
    buff.writeString('SAMP').writeUInt32LE(1);
    const writeString = (text: string) =>
      buff
        .writeUInt32LE(text.length)
        .writeBuffer(encodeWin1251Text(text));
    for (const server of servers) {
      writeString(server.ip);
      buff.writeUInt32LE(server.port);
      writeString(server.name);
      writeString(server.password);
      writeString(server.rconPassword);
    }
    return buff.toBuffer();
  }

  static fromServers(servers: SampFavouriteServer[], opts: FavouriteListOptions = {}) {
    return new FavouriteList({
      ...opts,
      servers
    });
  }

  private servers: SampFavouriteServer[] = [];

  constructor(opts: FavouriteListOptions = {}) {
    if (opts.servers) this.servers = opts.servers;
  }

  getServers() {
    return this.servers;
  }
}

