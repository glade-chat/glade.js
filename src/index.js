'use strict';

/**
 * glade.js — a Node.js library for the Glade (glade.chat) API and realtime gateway.
 * @module glade.js
 */

// --- Core ---
export { Client } from './client/Client.js';
export { REST } from './rest/REST.js';
export { Gateway } from './gateway/Gateway.js';
export { Routes } from './rest/Routes.js';

// --- Structures ---
export { Base } from './structures/Base.js';
export { User } from './structures/User.js';
export { ClientUser } from './structures/ClientUser.js';
export { House } from './structures/House.js';
export { Room, TextRoom, VoiceRoom, PortalRoom, createRoom } from './structures/Room.js';
export { Message } from './structures/Message.js';
export { Member } from './structures/Member.js';
export { Role } from './structures/Role.js';
export { DMChannel } from './structures/DMChannel.js';
export { Invite } from './structures/Invite.js';
export { ReactionGroup } from './structures/ReactionGroup.js';
export { VoiceState } from './structures/VoiceState.js';

// --- Managers ---
export { CachedManager } from './managers/CachedManager.js';
export { HouseManager } from './managers/HouseManager.js';
export { ChannelManager } from './managers/ChannelManager.js';
export { RoomManager } from './managers/RoomManager.js';
export { UserManager } from './managers/UserManager.js';
export { MessageManager } from './managers/MessageManager.js';
export { MemberManager } from './managers/MemberManager.js';
export { RoleManager } from './managers/RoleManager.js';
export { DMManager } from './managers/DMManager.js';
export { FriendManager } from './managers/FriendManager.js';
export { InviteManager } from './managers/InviteManager.js';

// --- Utilities ---
export { Collection } from './util/Collection.js';
export {
  PermissionsBitField,
  PermissionFlags,
  ALL_PERMISSIONS,
  DEFAULT_EVERYONE,
  CHANNEL_OVERRIDABLE,
} from './util/Permissions.js';
export {
  Events,
  GatewayDispatch,
  GatewayCommand,
  RoomTypes,
  PresenceStatus,
  FriendStatus,
  DefaultOptions,
  REFRESH_COOKIE,
} from './util/Constants.js';
export * from './util/Util.js';

// --- Errors ---
export { GladeError, GladeAPIError, GladeGatewayError } from './errors/index.js';

/** The installed glade.js version. */
export const version = '0.1.0';
