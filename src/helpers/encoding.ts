import {Buffer} from 'buffer';
import iconv from 'iconv-lite';

export const decodeWin1251Buffer = (buffer: Buffer) =>
  iconv.decode(buffer, 'win1251');
export const encodeWin1251Text = (text: string) =>
  iconv.encode(text, 'win1251');
