import {Resolver} from 'dns';

export const IPv4ToNumber = (ip: string) => {
  const a = ip.split('.');
  const buffer = new ArrayBuffer(4);
  const dv = new DataView(buffer);
  for (let i = 0; i < 4; i++)
    dv.setUint8(i, +a[i]);
  return dv.getUint32(0, true);
};

export const isStringAIPv4 = (str: string): boolean => /^((([01]?[0-9]{1,2}|2[0-4][0-9]|25[0-5])\.){3})(([01]?[0-9]{1,2}|2[0-4][0-9]|25[0-5]))$/.test(str);

export interface ResolveDnsOptions {
  domain: string;
  version: 'v4' | 'v6';
  servers?: string[];
}

export class ResolveDnsError extends Error {
  name = 'ResolveDnsError';
}

export const resolveDns = (opts: ResolveDnsOptions): Promise<string | null> => {
  return new Promise<string | null>((resolve) => {
    if (!opts) throw new ResolveDnsError('options not passed');
    const {domain, version, servers} = opts;
    if (!domain) throw new ResolveDnsError('options.domain not passed');
    if (!version) throw new ResolveDnsError('options.version not passed');

    const resolver = new Resolver();
    if (servers) resolver.setServers(servers);

    let _resolve: typeof resolver.resolve4;
    if (version === 'v4') {
      _resolve = resolver.resolve4;
    } else if (version === 'v6') {
      _resolve = resolver.resolve6;
    } else {
      resolve(null);
      return;
    }
    _resolve.bind(resolver)(domain, (error, addresses) => {
      if (error || addresses.length === 0) {
        resolve(null);
      } else {
        resolve(addresses[0]);
      }
    });
  });
};
