import dgram from 'dgram';
import {
  serializeSAMPOpcodePacket,
  isStringAIPv4,
  resolveDns,
  deserializeSAMPOpcodePacket,
  decodeWin1251Buffer
} from '~/helpers';
import {SmartBuffer} from 'smart-buffer';

export interface SampQueryOptions {
  /**
   * Server IP address
   */
  ip?: string;
  /**
   * Server host
   */
  host?: string;
  /**
   * Server port
   */
  port?: number;
  /**
   * Request timeout
   */
  timeout?: number;
}

export const SAMP_QUERY_PLAYERS_OPCODE = 99;
export const SAMP_QUERY_PLAYERS_DETAILED_OPCODE = 100;
export const SAMP_QUERY_INFO_OPCODE = 105;
export const SAMP_QUERY_RULES_OPCODE = 114;

export type SampQueryOpcode =
  | typeof SAMP_QUERY_PLAYERS_OPCODE
  | typeof SAMP_QUERY_PLAYERS_DETAILED_OPCODE
  | typeof SAMP_QUERY_INFO_OPCODE
  | typeof SAMP_QUERY_RULES_OPCODE;

export interface SampQueryRequestOptions<O extends SampQueryOpcode = SampQueryOpcode> extends SampQueryOptions {
  /**
   * Opcode
   */
  opcode: O;
}

export type SampQueryServerRule = 'lagcomp' | 'mapname' | 'version' | 'weather' | 'weburl' | 'worldtime';
export interface SampQueryPlayer {
  id: number;
  ping: number;
  name: string;
  score: number;
}

export interface SampQueryInfoResult {
  serverName: string;
  gameModeName: string;
  players: number;
  maxPlayers: number;
  language: string;
  closed: boolean;
}

export type SampQueryRulesResult = Array<{ name: SampQueryServerRule, value: string }>;
export type SampQueryPlayersDetailedResult = Array<SampQueryPlayer>;
export type SampQueryPlayersResult = Array<Pick<SampQueryPlayer, 'name' | 'score'>>;

export class SampQueryError extends Error {
  name = 'SampQueryError';
}

export class SampQuery {
  public options: SampQueryOptions;

  constructor(options: SampQueryOptions = {}) {
    this.options = options;
  }

  async getServer(options: SampQueryOptions = {}) {
    const [info, rules] = await Promise.all([
      this.getServerInfo(options),
      this.getServerRules(options)
    ]);
    return {
      info,
      rules,
      players: info.players >= 100 ? [] : await this.getServerPlayers(options)
    };
  }

  async getServerInfo(options: SampQueryOptions = {}) {
    return this.request({
      ...options,
      opcode: SAMP_QUERY_INFO_OPCODE
    });
  }

  async getServerRules(options: SampQueryOptions = {}) {
    return this.request({
      ...options,
      opcode: SAMP_QUERY_RULES_OPCODE
    });
  }

  async getServerPlayers(options: SampQueryOptions = {}) {
    return this.request({
      ...options,
      opcode: SAMP_QUERY_PLAYERS_OPCODE
    });
  }

  async getServerPlayersDetailed(options: SampQueryOptions = {}) {
    return this.request({
      ...options,
      opcode: SAMP_QUERY_PLAYERS_DETAILED_OPCODE
    });
  }

  async getServerPing(options: SampQueryOptions = {}) {
    const startTime = Date.now();
    await this.getServerInfo(options);
    return (Date.now() - startTime);
  }

  async request(opts: SampQueryRequestOptions<typeof SAMP_QUERY_INFO_OPCODE>): Promise<SampQueryInfoResult>
  async request(opts: SampQueryRequestOptions<typeof SAMP_QUERY_RULES_OPCODE>): Promise<SampQueryRulesResult>
  async request(opts: SampQueryRequestOptions<typeof SAMP_QUERY_PLAYERS_DETAILED_OPCODE>): Promise<SampQueryPlayersDetailedResult>
  async request(opts: SampQueryRequestOptions<typeof SAMP_QUERY_PLAYERS_OPCODE>): Promise<SampQueryPlayersResult>
  async request({
    ip = this.options.ip,
    host = this.options.host,
    port = this.options.port,
    timeout = this.options.timeout,
    opcode
  }: SampQueryRequestOptions): Promise<unknown> {
    if (!port) port = 7777;
    if (!timeout) timeout = 2000;

    let resolve: (value: unknown) => void;
    let reject: (reason?: unknown) => void;

    const promise = new Promise<unknown>((r, rj) => {
      resolve = r;
      reject = rj;
    });

    if (!ip) {
      if (!host) {
        ip = '127.0.0.1';
      } else {
        if (isStringAIPv4(host)) {
          ip = host;
        } else {
          const resolvedIp = await resolveDns({
            version: 'v4',
            domain: host
          });
          if (!resolvedIp) throw new SampQueryError('cannot resolve ip');
          ip = resolvedIp;
        }
      }
    }

    const socket = dgram.createSocket('udp4');
    const sendData = serializeSAMPOpcodePacket({
      port,
      ip,
      opcode
    });
    const sendPacket = () => {
      socket.send(sendData, port, ip, (err) => {
        if (err) {
          reject(err);
          socket.close();
        }
      });
    };

    const controller = setTimeout(() => {
      socket.close();
      reject(new SampQueryError(`server ${ip}:${port} unavailable`));
    }, timeout);

    socket.once('message', async (message) => {
      try {
        clearTimeout(controller);
        if (message.length < 11) return reject(new SampQueryError(`${this.options.ip}:${this.options.port} sent invalid message`));
        socket.close();
        const packet = deserializeSAMPOpcodePacket(message);
        if (!packet) return null;
        const data = SmartBuffer.fromBuffer(packet.data);
        switch (packet.opcode) {
        case SAMP_QUERY_INFO_OPCODE: {
          resolve({
            closed: !!data.readUInt8(),
            players: data.readUInt16LE(),
            maxPlayers: data.readUInt16LE(),
            serverName: decodeWin1251Buffer(data.readBuffer(data.readUInt32LE())),
            gameModeName: decodeWin1251Buffer(data.readBuffer(data.readUInt32LE())),
            language: decodeWin1251Buffer(data.readBuffer(data.readUInt32LE())),
          });
          break;
        }
        case SAMP_QUERY_RULES_OPCODE: {
          const rulesResult: SampQueryRulesResult = [];
          const count = data.readUInt16LE();
          for (let i = 0; i < count; ++i) {
            const name = <SampQueryServerRule> decodeWin1251Buffer(data.readBuffer(data.readUInt8()));
            const value = decodeWin1251Buffer(data.readBuffer(data.readUInt8()));
            rulesResult.push({
              name,
              value
            });
          }
          resolve(rulesResult);
          break;
        }
        case SAMP_QUERY_PLAYERS_DETAILED_OPCODE: {
          const playersResult: SampQueryPlayersDetailedResult = [];
          const count = data.readUInt16LE();
          for (let i = 0; i < count; ++i) {
            const id = data.readUInt8();
            const name = decodeWin1251Buffer(data.readBuffer(data.readUInt8()));
            const score = data.readUInt32LE();
            const ping = data.readUInt32LE();
            playersResult.push({
              id,
              name,
              score,
              ping,
            });
          }
          resolve(playersResult);
          break;
        }
        case SAMP_QUERY_PLAYERS_OPCODE: {
          const playersResult: SampQueryPlayersResult = [];
          const count = data.readUInt16LE();
          for (let i = 0; i < count; ++i) {
            const name = decodeWin1251Buffer(data.readBuffer(data.readUInt8()));
            const score = data.readUInt32LE();
            playersResult.push({
              name,
              score,
            });
          }
          resolve(playersResult);
          break;
        }
        }
      } catch (error) {
        reject(error);
      }

    });
    sendPacket();
    return promise;
  }
}
