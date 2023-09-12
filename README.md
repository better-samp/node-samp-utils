<p align="center">
  <img src="https://github.com/better-samp/node-samp-utils/raw/master/.github/samp-utils.png" alt="samp-utils logo">
</p>
<p align="center">
  <b>samp-utils</b>
</p>
<p align="center">Modern ES6 Promise based SAMP Utils</p>

| [📖 References](https://better-samp.github.io/samp-utils/refs/index.html) |
|---------------------------------------------------------------------------|

<p align="center">
 <a href="https://npmjs.com/package/samp-utils">
   <img src="https://img.shields.io/npm/v/samp-utils?label=version&logo=npm&color=ligthgreen" alt="Version">
 </a>
 <a href="https://npmjs.com/package/samp-utils">
   <img src="https://img.shields.io/npm/dt/samp-utils?&logo=npm" alt="Version">
 </a>
</p>

## Install 📦

```bash
# using npm
npm i samp-utils
# using yarn
yarn add samp-utils
# using pnpm
pnpm add samp-utils
```

## Usage 🔧

Check all available modules in [📖 References](https://better-samp.github.io/samp-utils/refs/index.html).

```js
import {SampQuery} from 'samp-utils';

const query = new SampQuery({
  host: 'samp.sr.team',
  port: 1337
});

const main = async () => {
  const info = await query.getServerInfo();
  console.log(`server=${info.gameModeName}, players=${info.players}/${info.maxPlayers}`);
  // output: server=Prime-Hack CheatAllowing, players=1/10
};

main().catch(console.error);
```
