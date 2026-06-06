/**
 * Example glade.js bot.
 *
 * Replies "Pong! 🌿" to `!ping`, and echoes `!say <text>`.
 */
import { Client, Events } from '@glade.chat/glade.js';

const client = new Client();

client.on(Events.Ready, () => {
  console.log(`🌿 Logged in as @${client.user.handle} — in ${client.houses.cache.size} house(s)`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.authorId === client.user.id) return; // ignore our own messages

  if (message.content === '!ping') {
    await message.reply('Pong! 🌿');
  } else if (message.content.startsWith('!say ')) {
    await message.reply(message.content.slice('!say '.length));
  }
});

client.on(Events.Error, (err) => console.error('Client error:', err));

client.login(`token`);
