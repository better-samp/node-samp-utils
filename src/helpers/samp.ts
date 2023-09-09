import {SmartBuffer} from 'smart-buffer';
import {IPv4ToNumber} from '~/helpers/net';
import {Buffer} from 'buffer';

export const SAMP_HEADER = 0x504D4153;

export interface SerializeSAMPOpcodePacketOptions {
  ip: string | number;
  port: number;
  opcode: number;
  data?: Buffer;
}

export type DeserializeSAMPOpcodePacketResult = {
  ip: string;
  numericIp: number;
  port: number;
  opcode: number;
  data: Buffer;
} | null;

export const serializeSAMPOpcodePacket = ({
  ip, port, opcode, data = Buffer.alloc(0)
}: SerializeSAMPOpcodePacketOptions): Buffer =>
  new SmartBuffer()
    .writeUInt32LE(SAMP_HEADER)
    .writeUInt32LE(typeof ip === 'number' ? ip : IPv4ToNumber(ip))
    .writeUInt16LE(port)
    .writeUInt8(opcode)
    .writeBuffer(data)
    .toBuffer();

export const deserializeSAMPOpcodePacket = (buf: Buffer): DeserializeSAMPOpcodePacketResult => {
  const bs = SmartBuffer.fromBuffer(buf);
  if (bs.readUInt32LE() !== SAMP_HEADER) return null;
  const numericIp = bs.readUInt32LE();
  const ipBuff = Buffer.alloc(4);
  ipBuff.writeUInt32LE(numericIp);
  const ip = `${ipBuff[3]}.${ipBuff[2]}.${ipBuff[1]}.${ipBuff[0]}`;
  return {
    ip,
    numericIp,
    port: bs.readUInt16LE(),
    opcode: bs.readInt8(),
    data: bs.readBuffer(),
  };
};
