<div align="center">

# glade.js 🌿

A powerful, fully-typed Node.js library for the [Glade](https://glade.chat) API and real-time gateway.

[![npm version](https://img.shields.io/npm/v/@glade-chat/glade.js.svg?maxAge=3600)](https://www.npmjs.com/package/@glade-chat/glade.js)
[![npm downloads](https://img.shields.io/npm/dt/@glade-chat/glade.js.svg?maxAge=3600)](https://www.npmjs.com/package/@glade-chat/glade.js)
[![license](https://img.shields.io/npm/l/@glade-chat/glade.js.svg?maxAge=3600)](./LICENSE)

</div>

## About

glade.js is an object-oriented library that makes it easy to interact with Glade — Houses,
Rooms, Messages, Members, Roles, DMs, friends, presence, and voice — over REST and the
real-time gateway.

- Object-oriented
- Cache-backed and event-driven
- Handles login and token refresh for you
- First-class TypeScript types, zero build step (pure ESM)

## Installation

**Node.js 18.17 or newer is required.**

```bash
npm install @glade-chat/glade.js
```

## Example usage

```js
import { Client, Events } from '@glade-chat/glade.js';

const client = new Client();

client.on(Events.Ready, () => {
  console.log(`Logged in as @${client.user.handle}`);
});

client.on(Events.MessageCreate, (message) => {
  if (message.content === '!ping') message.reply('Pong! 🌿');
});

client.login(`token`);
```

## License

[MIT](./LICENSE)
