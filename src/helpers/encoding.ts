import {Buffer} from 'buffer';
import iconv from 'iconv-lite';

export const decodeWin1251Buffer = (buffer: Buffer) =>
  iconv.decode(buffer, 'win1251');
