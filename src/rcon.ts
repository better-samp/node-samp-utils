import {Buffer} from 'buffer';
import {Socket, createSocket} from 'dgram';
import {SmartBuffer} from 'smart-buffer';
import {TypedEmitter} from 'tiny-typed-emitter';
import {decodeWin1251Buffer, encodeWin1251Text} from '~/helpers/encoding';
import {deserializeSAMPOpcodePacket, serializeSAMPOpcodePacket} from '~/helpers/samp';

export const SAMP_RCON_OPCODE = 0x78;

export interface RCONClientOptions {
  ip?: string;
  port?: number;
  password: string;
}

export interface IRCONClientEvents {
  'connect': () => unknown;
  'message': (text: string) => unknown;
  'error': (err: unknown) => unknown;
}

export class RCONClient extends TypedEmitter<IRCONClientEvents> {
  private readonly ip: string = '127.0.0.1';
  private readonly port: number = 7777;
  private password: string;
  private socket: Socket = createSocket('udp4');

  constructor(opts: RCONClientOptions) {
    super();
    if (opts.ip) this.ip = opts.ip;
    if (opts.port) this.port = opts.port;
    this.password = opts.password;
    this.socket.on('message', this.onReceive.bind(this));
    this.socket.on('connect', this.emit.bind(this, 'connect'));
  }

  connect() {
    return new Promise<void>((resolve) => {
      this.socket.connect(this.port, this.ip, () => {
        this.emit('connect');
        resolve();
      });
    });
  }

  disconnect() {
    this.socket.disconnect();
  }

  private onReceive(message: Buffer) {
    try {
      const packet = deserializeSAMPOpcodePacket(message);
      if (!packet) return;
      if (packet.ip !== this.ip) return;
      if (packet.port !== this.port) return;
      if (packet.opcode !== SAMP_RCON_OPCODE) return;
      const data = SmartBuffer.fromBuffer(packet.data);
      const textLen = data.readInt16LE();
      const text = decodeWin1251Buffer(data.readBuffer(textLen));
      this.emit('message', text);
    } catch (error) {
      this.emit('error', error);
    }
  }

  send(cmd: string) {
    const data = new SmartBuffer();
    data
      .writeUInt16LE(this.password.length)
      .writeBuffer(encodeWin1251Text(this.password))
      .writeInt16LE(cmd.length)
      .writeBuffer(encodeWin1251Text(cmd));
    const packet = serializeSAMPOpcodePacket({
      ip: this.ip,
      port: this.port,
      opcode: SAMP_RCON_OPCODE,
      data: data.toBuffer()
    });
    this.socket.send(packet, this.port, this.ip);
  }

  call(cmd: string, responseTimeout = 5000): Promise<string> {
    this.send(cmd);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject();
      }, responseTimeout);
      this.once('message', (text) => {
        resolve(text);
        clearTimeout(timeout);
      });
    });
  }
}
