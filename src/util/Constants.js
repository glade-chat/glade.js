'use strict';

/**
 * Default {@link Client} options. The backend URLs default to the public Glade
 * service; override `rest`/`gateway` to target a self-hosted deployment.
 */
export const DefaultOptions = {
  /** Base origin of the REST API, without the version segment. */
  rest: 'https://api.glade.chat',
  /** Origin of the Socket.IO gateway. */
  gateway: 'https://ws.glade.chat',
  /** API version path segment. */
  version: 'v1',
  /** Whether the REST client should auto-refresh the access token on a 401. */
  autoRefresh: true,
  /**
   * How many ms before the access token's expiry to proactively refresh it.
   * Keeps a long-running gateway connection authenticated.
   */
  refreshSkewMs: 60_000,
  /** Whether to cache structures received from REST and the gateway. */
  cache: true,
  /**
   * Auto-subscribe to a House room's realtime events by emitting `room:join`.
   * The server only auto-joins user/house/DM channels on connect, so without this
   * the client receives no text-room message/typing/reaction events.
   */
  autoSubscribeRooms: true,
  /** Socket.IO client options merged into the gateway connection. */
  ws: {
    transports: ['websocket', 'polling'],
  },
  /** When true, the client emits verbose `debug` events. */
  debug: false,
};

/**
 * Client-facing event names (camelCase), emitted by {@link Client}.
 * @enum {string}
 */
export const Events = {
  Ready: 'ready',
  Debug: 'debug',
  Error: 'error',
  Warn: 'warn',
  Raw: 'raw',

  Connecting: 'connecting',
  Reconnecting: 'reconnecting',
  Disconnect: 'disconnect',

  MessageCreate: 'messageCreate',
  MessageUpdate: 'messageUpdate',
  MessageDelete: 'messageDelete',
  MessagePinUpdate: 'messagePinUpdate',
  MessageReactionUpdate: 'messageReactionUpdate',

  TypingStart: 'typingStart',
  PresenceUpdate: 'presenceUpdate',
  Mention: 'mention',

  RoomCreate: 'roomCreate',
  RoomUpdate: 'roomUpdate',
  RoomDelete: 'roomDelete',
  RoomsReorder: 'roomsReorder',

  HouseUpdate: 'houseUpdate',
  HouseDelete: 'houseDelete',
  MemberJoin: 'memberJoin',
  MembersUpdate: 'membersUpdate',
  RolesUpdate: 'rolesUpdate',

  FriendRequest: 'friendRequest',
  FriendAccepted: 'friendAccepted',
  FriendRemoved: 'friendRemoved',

  VoicePeerJoin: 'voicePeerJoin',
  VoicePeerLeave: 'voicePeerLeave',
  VoicePeerUpdate: 'voicePeerUpdate',
  VoiceRoomState: 'voiceRoomState',
  VoiceSignal: 'voiceSignal',

  SessionRevoked: 'sessionRevoked',
};

/**
 * Raw Socket.IO event names the server dispatches to the client (server → client).
 * @enum {string}
 */
export const GatewayDispatch = {
  Ready: 'ready',
  MessageNew: 'message:new',
  MessageUpdated: 'message:updated',
  MessageDeleted: 'message:deleted',
  MessagePinned: 'message:pinned',
  ReactionUpdated: 'reaction:updated',
  Mention: 'mention',
  DmIncoming: 'dm:incoming',
  Typing: 'typing',
  PresenceUpdate: 'presence:update',
  RoomCreated: 'room:created',
  RoomUpdated: 'room:updated',
  RoomDeleted: 'room:deleted',
  RoomReordered: 'room:reordered',
  HouseUpdated: 'house:updated',
  HouseDeleted: 'house:deleted',
  RolesUpdated: 'roles:updated',
  MembersUpdated: 'members:updated',
  MemberJoined: 'member:joined',
  FriendRequest: 'friend:request',
  FriendAccepted: 'friend:accepted',
  FriendRemoved: 'friend:removed',
  SessionRevoked: 'session:revoked',
  VoicePeerJoined: 'voice:peer-joined',
  VoicePeerLeft: 'voice:peer-left',
  VoicePeerState: 'voice:peer-state',
  VoiceRoomState: 'voice:room-state',
  VoiceSignal: 'voice:signal',
};

/**
 * Raw Socket.IO event names the client emits to the server (client → server).
 * @enum {string}
 */
export const GatewayCommand = {
  RoomJoin: 'room:join',
  RoomLeave: 'room:leave',
  MessageSend: 'message:send',
  MessageEdit: 'message:edit',
  MessageDelete: 'message:delete',
  ReactionToggle: 'reaction:toggle',
  TypingStart: 'typing:start',
  TypingStop: 'typing:stop',
  PresenceSet: 'presence:set',
  VoiceJoin: 'voice:join',
  VoiceLeave: 'voice:leave',
  VoiceSync: 'voice:sync',
  VoiceSignal: 'voice:signal',
  VoiceState: 'voice:state',
};

/**
 * Room (channel) types.
 * @enum {string}
 */
export const RoomTypes = {
  Text: 'text',
  Voice: 'voice',
  Portal: 'portal',
};

/**
 * Presence statuses a user can hold.
 * @enum {string}
 */
export const PresenceStatus = {
  Online: 'online',
  Idle: 'idle',
  DnD: 'dnd',
  Offline: 'offline',
};

/** Statuses a user may manually set (offline is implicit). */
export const SettableStatus = [
  PresenceStatus.Online,
  PresenceStatus.Idle,
  PresenceStatus.DnD,
];

/**
 * Friendship statuses returned by the friends API.
 * @enum {string}
 */
export const FriendStatus = {
  Self: 'self',
  None: 'none',
  Friends: 'friends',
  Incoming: 'incoming',
  Outgoing: 'outgoing',
};

/** Name of the httpOnly refresh-token cookie the backend sets. */
export const REFRESH_COOKIE = 'glade_rt';
