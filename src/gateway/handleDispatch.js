'use strict';

import { Events, GatewayDispatch } from '../util/Constants.js';
import { VoiceState } from '../structures/VoiceState.js';

/**
 * Translates a raw gateway event into cache mutations and client-facing events.
 * Invoked for every server dispatch by the {@link Gateway}.
 *
 * @param {import('../client/Client.js').Client} client
 * @param {string} event Raw Socket.IO event name.
 * @param {any} data Event payload.
 */
export function handleDispatch(client, event, data) {
  // Surface every raw event for power users / debugging.
  client.emit(Events.Raw, event, data);

  switch (event) {
    case GatewayDispatch.Ready: {
      client.ready = true;
      // The server only auto-joins user/house/DM channels — explicitly subscribe
      // to each cached room so we receive room messages, typing, and reactions.
      client._subscribeCachedRooms();
      client.emit(Events.Ready, client);
      break;
    }

    case GatewayDispatch.MessageNew: {
      const message = client._cacheMessage(data);
      client.emit(Events.MessageCreate, message);
      break;
    }

    case GatewayDispatch.MessageUpdated: {
      const existing = findCachedMessage(client, data);
      const old = existing ? existing._clone() : null;
      const message = client._cacheMessage(data);
      client.emit(Events.MessageUpdate, old, message);
      break;
    }

    case GatewayDispatch.MessageDeleted: {
      const existing = findCachedMessage(client, data);
      removeCachedMessage(client, data);
      client.emit(Events.MessageDelete, existing ?? data);
      break;
    }

    case GatewayDispatch.MessagePinned: {
      const existing = findCachedMessage(client, { id: data.messageId, roomId: data.roomId });
      if (existing) existing.pinned = data.pinned;
      client.emit(Events.MessagePinUpdate, {
        roomId: data.roomId,
        messageId: data.messageId,
        pinned: data.pinned,
        message: existing ?? null,
      });
      break;
    }

    case GatewayDispatch.ReactionUpdated: {
      const existing = findCachedMessage(client, {
        id: data.messageId,
        roomId: data.roomId,
        dmChannelId: data.dmChannelId,
      });
      if (existing) existing._patch({ reactions: data.reactions });
      client.emit(Events.MessageReactionUpdate, {
        messageId: data.messageId,
        roomId: data.roomId ?? null,
        dmChannelId: data.dmChannelId ?? null,
        reactions: existing ? existing.reactions : data.reactions,
        message: existing ?? null,
      });
      break;
    }

    case GatewayDispatch.Mention: {
      const message = client._cacheMessage(data.message);
      client.emit(Events.Mention, {
        houseId: data.houseId,
        roomId: data.roomId,
        message,
      });
      break;
    }

    case GatewayDispatch.DmIncoming: {
      // The message also arrives via `message:new` (the socket is in the DM room),
      // so we only ensure the channel/message are cached here — no duplicate event.
      client._cacheMessage(data.message);
      break;
    }

    case GatewayDispatch.Typing: {
      const user = client.users.cache.get(data.userId) ?? null;
      client.emit(Events.TypingStart, {
        userId: data.userId,
        handle: data.handle,
        user,
        roomId: data.roomId ?? null,
        dmChannelId: data.dmChannelId ?? null,
        typing: data.typing,
      });
      break;
    }

    case GatewayDispatch.PresenceUpdate: {
      const user = client.users.cache.get(data.userId);
      if (user) user.status = data.status;
      // Reflect on cached House members too.
      for (const house of client.houses.cache.values()) {
        const member = house.members.cache.get(data.userId);
        if (member) member.status = data.status;
      }
      client.emit(Events.PresenceUpdate, { userId: data.userId, status: data.status, user: user ?? null });
      break;
    }

    case GatewayDispatch.RoomCreated: {
      const house = client.houses.cache.get(data.houseId);
      const room = house ? house.rooms._add(data) : null;
      client.emit(Events.RoomCreate, room ?? data);
      break;
    }

    case GatewayDispatch.RoomUpdated: {
      if (data.id) {
        const existing = client.channels.cache.get(data.id);
        const old = existing ? existing._clone() : null;
        const house = client.houses.cache.get(data.houseId ?? existing?.houseId);
        const room = house ? house.rooms._add(data) : existing;
        client.emit(Events.RoomUpdate, old, room ?? data);
      } else {
        // Override-only update: just a houseId hint to refetch.
        client.emit(Events.RoomUpdate, null, data);
      }
      break;
    }

    case GatewayDispatch.RoomDeleted: {
      const existing = client.channels.cache.get(data.roomId) ?? null;
      const house = client.houses.cache.get(data.houseId);
      house?.rooms.cache.delete(data.roomId);
      client.channels.cache.delete(data.roomId);
      client.emit(Events.RoomDelete, existing ?? data);
      break;
    }

    case GatewayDispatch.RoomReordered: {
      client.emit(Events.RoomsReorder, { houseId: data.houseId });
      break;
    }

    case GatewayDispatch.HouseUpdated: {
      client.emit(Events.HouseUpdate, { houseId: data.houseId, house: client.houses.cache.get(data.houseId) ?? null });
      break;
    }

    case GatewayDispatch.HouseDeleted: {
      const house = client.houses.cache.get(data.houseId) ?? null;
      client.houses.cache.delete(data.houseId);
      client.emit(Events.HouseDelete, house ?? data);
      break;
    }

    case GatewayDispatch.RolesUpdated: {
      client.emit(Events.RolesUpdate, { houseId: data.houseId });
      break;
    }

    case GatewayDispatch.MembersUpdated: {
      client.emit(Events.MembersUpdate, { houseId: data.houseId });
      break;
    }

    case GatewayDispatch.MemberJoined: {
      client.emit(Events.MemberJoin, { houseId: data.houseId, userId: data.userId });
      break;
    }

    case GatewayDispatch.FriendRequest: {
      const user = data.user ? client.users._add(data.user) : null;
      client.emit(Events.FriendRequest, { id: data.id, user });
      break;
    }

    case GatewayDispatch.FriendAccepted: {
      const user = data.user ? client.users._add(data.user) : null;
      if (user) client.friends.cache.set(user.id, user);
      client.emit(Events.FriendAccepted, { user });
      break;
    }

    case GatewayDispatch.FriendRemoved: {
      client.friends.cache.delete(data.userId);
      client.emit(Events.FriendRemoved, { userId: data.userId });
      break;
    }

    case GatewayDispatch.SessionRevoked: {
      client.emit(Events.SessionRevoked, { sessionId: data.sessionId });
      break;
    }

    case GatewayDispatch.VoicePeerJoined: {
      client.emit(Events.VoicePeerJoin, new VoiceState(client, data));
      break;
    }

    case GatewayDispatch.VoicePeerLeft: {
      client.emit(Events.VoicePeerLeave, { socketId: data.socketId });
      break;
    }

    case GatewayDispatch.VoicePeerState: {
      client.emit(Events.VoicePeerUpdate, new VoiceState(client, data));
      break;
    }

    case GatewayDispatch.VoiceRoomState: {
      client.emit(Events.VoiceRoomState, {
        roomId: data.roomId,
        users: (data.users ?? []).map((u) => new VoiceState(client, { ...u, roomId: data.roomId })),
      });
      break;
    }

    case GatewayDispatch.VoiceSignal: {
      client.emit(Events.VoiceSignal, data);
      break;
    }

    default:
      // Unknown event — already surfaced via the `raw` event above.
      break;
  }
}

/** Finds a cached message in its owning channel, if both are cached. */
function findCachedMessage(client, ref) {
  if (ref.roomId) {
    const room = client.channels.cache.get(ref.roomId);
    if (room) return room.messages.cache.get(ref.id) ?? null;
  }
  if (ref.dmChannelId) {
    const dm = client.dms.cache.get(ref.dmChannelId);
    if (dm) return dm.messages.cache.get(ref.id) ?? null;
  }
  return null;
}

/** Removes a cached message from its owning channel. */
function removeCachedMessage(client, ref) {
  if (ref.roomId) client.channels.cache.get(ref.roomId)?.messages.cache.delete(ref.id);
  if (ref.dmChannelId) client.dms.cache.get(ref.dmChannelId)?.messages.cache.delete(ref.id);
}

export default handleDispatch;
