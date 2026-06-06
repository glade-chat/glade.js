/**
 * Type definitions for glade.js — the Node.js library for the Glade (glade.chat)
 * API and realtime gateway.
 */

import { EventEmitter } from 'node:events';
import type { Socket } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Primitives & shared types
// ---------------------------------------------------------------------------

export type RoomType = 'text' | 'voice' | 'portal';
export type PresenceStatusType = 'online' | 'idle' | 'dnd' | 'offline';
export type SettableStatusType = 'online' | 'idle' | 'dnd';
export type FriendStatusType = 'self' | 'none' | 'friends' | 'incoming' | 'outgoing';

export type PermissionFlagName =
  | 'Administrator'
  | 'ManageHouse'
  | 'ManageRoles'
  | 'ManageChannels'
  | 'KickMembers'
  | 'ManageMessages'
  | 'ViewChannels'
  | 'SendMessages'
  | 'Connect';

export type PermissionResolvable =
  | PermissionFlagName
  | number
  | PermissionsBitField
  | Array<PermissionFlagName | number | PermissionsBitField>;

export interface MessagePayload {
  content: string;
  nonce?: string;
  mentions?: string[];
}

export interface ClientOptions {
  /** REST origin, without the version segment. Default `https://api.glade.chat`. */
  rest?: string;
  /** Socket.IO gateway origin. Defaults to `rest` when set, else `https://ws.glade.chat`. */
  gateway?: string;
  /** API version segment. Default `v1`. */
  version?: string;
  /** A pre-obtained access token to log in with. */
  token?: string;
  /** Refresh the access token and retry on a 401. Default `true`. */
  autoRefresh?: boolean;
  /** Ms before token expiry to refresh proactively. Default `60000`. */
  refreshSkewMs?: number;
  /** Cache structures from REST/gateway. Default `true`. */
  cache?: boolean;
  /** Auto-subscribe to cached rooms' realtime events on ready. Default `true`. */
  autoSubscribeRooms?: boolean;
  /** Prefetch the client's Houses (and their rooms/roles) on login. Default `true`. */
  fetchHouses?: boolean;
  /** Prefetch the client's DM channels on login. Default `true`. */
  fetchDMs?: boolean;
  /** Extra socket.io-client options. */
  ws?: Record<string, unknown>;
  /** Emit verbose `debug` events. Default `false`. */
  debug?: boolean;
}

export interface RequestTokenOptions {
  handle: string;
  password: string;
  /** Two-factor code, if the account has 2FA enabled. */
  code?: string;
  /** Captcha token, if the deployment requires it. */
  turnstileToken?: string;
  /** Backend REST origin (defaults to the public Glade API). */
  rest?: string;
  /** API version segment. */
  version?: string;
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  location: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export interface PermissionOverride {
  id: string;
  roomId: string;
  roleId: string;
  allow: number;
  deny: number;
}

export interface VoiceOccupant {
  userId: string;
  muted: boolean;
  deafened: boolean;
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export class Collection<K, V> extends Map<K, V> {
  first(): V | undefined;
  first(amount: number): V[];
  last(): V | undefined;
  last(amount: number): V[];
  random(): V | undefined;
  find(fn: (value: V, key: K, collection: this) => boolean): V | undefined;
  findKey(fn: (value: V, key: K, collection: this) => boolean): K | undefined;
  filter(fn: (value: V, key: K, collection: this) => boolean): Collection<K, V>;
  map<T>(fn: (value: V, key: K, collection: this) => T): T[];
  some(fn: (value: V, key: K, collection: this) => boolean): boolean;
  every(fn: (value: V, key: K, collection: this) => boolean): boolean;
  reduce<T>(fn: (accumulator: T, value: V, key: K, collection: this) => T, initial?: T): T;
  each(fn: (value: V, key: K, collection: this) => void): this;
  toArray(): V[];
  keyArray(): K[];
  clone(): Collection<K, V>;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export const PermissionFlags: { readonly [K in PermissionFlagName]: number };
export const ALL_PERMISSIONS: number;
export const DEFAULT_EVERYONE: number;
export const CHANNEL_OVERRIDABLE: number;

export class PermissionsBitField {
  constructor(bits?: PermissionResolvable);
  bitfield: number;
  static Flags: typeof PermissionFlags;
  static All: number;
  static DefaultEveryone: number;
  static resolve(bits?: PermissionResolvable): number;
  has(permission: PermissionResolvable, checkAdmin?: boolean): boolean;
  any(permission: PermissionResolvable): boolean;
  add(...bits: PermissionResolvable[]): this;
  remove(...bits: PermissionResolvable[]): this;
  toArray(): PermissionFlagName[];
  valueOf(): number;
  toJSON(): PermissionFlagName[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class GladeError extends Error {}

export class GladeAPIError extends GladeError {
  constructor(opts: { status: number; message: string; method: string; path: string; details?: unknown });
  status: number;
  rawMessage: string;
  method: string;
  path: string;
  details: unknown;
}

export class GladeGatewayError extends GladeError {
  constructor(message: string, code?: string);
  code: string | null;
}

// ---------------------------------------------------------------------------
// REST & Gateway
// ---------------------------------------------------------------------------

export interface RequestOptions {
  method?: string;
  path: string;
  body?: unknown;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  auth?: boolean;
  sendCookie?: boolean;
  rawBody?: BodyInit;
}

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  contentType: string;
}

export class REST {
  constructor(options?: {
    base?: string;
    version?: string;
    autoRefresh?: boolean;
    onToken?: (token: string) => void;
    debug?: (msg: string) => void;
  });
  base: string;
  version: string;
  autoRefresh: boolean;
  token: string | null;
  refreshCookie: string | null;
  readonly apiBase: string;
  setToken(token: string | null): this;
  setRefreshToken(value: string | null): this;
  request<T = unknown>(opts: RequestOptions): Promise<T>;
  get<T = unknown>(path: string, opts?: Partial<RequestOptions>): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, opts?: Partial<RequestOptions>): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, opts?: Partial<RequestOptions>): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, opts?: Partial<RequestOptions>): Promise<T>;
  delete<T = unknown>(path: string, opts?: Partial<RequestOptions>): Promise<T>;
  refresh(): Promise<string | null>;
  upload(
    file: Buffer | Uint8Array | Blob,
    opts?: { name?: string; contentType?: string; kind?: 'avatar' | 'attachment' },
  ): Promise<UploadResult>;
}

export class Gateway {
  constructor(opts: {
    url: string;
    getToken: () => string | null;
    refresh: () => Promise<string | null>;
    onDispatch: (event: string, data: any) => void;
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    onError?: (err: Error) => void;
    debug?: (msg: string) => void;
    ws?: Record<string, unknown>;
    maxHandshakeRefresh?: number;
  });
  socket: Socket | null;
  id: string | null;
  readonly connected: boolean;
  connect(): void;
  disconnect(): void;
  send(event: string, ...args: any[]): void;
  request<T = any>(event: string, payload?: any, timeout?: number): Promise<T>;
}

// ---------------------------------------------------------------------------
// Structures
// ---------------------------------------------------------------------------

export abstract class Base {
  readonly client: Client;
  id?: string;
  toJSON(): Record<string, unknown>;
  valueOf(): string | undefined;
}

export class User extends Base {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  status: PresenceStatusType;
  bot: boolean;
  badges: string[];
  publicKey: string | null;
  twoFactorEnabled: boolean;
  createdAt: string | null;
  readonly tag: string;
  createDM(): Promise<DMChannel>;
  send(content: string | MessagePayload): Promise<Message>;
  fetch(): Promise<User>;
  toString(): string;
}

export class ClientUser extends User {
  setPresence(status: SettableStatusType): this;
  edit(data: {
    displayName?: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    bio?: string;
    status?: SettableStatusType;
    publicKey?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<this>;
  setStatus(status: SettableStatusType): Promise<this>;
  setDisplayName(displayName: string): Promise<this>;
  setBio(bio: string): Promise<this>;
  setAvatar(
    avatar: string | Buffer | Uint8Array | Blob | null,
    fileOptions?: { name?: string; contentType?: string },
  ): Promise<this>;
  setBanner(
    banner: string | Buffer | Uint8Array | Blob | null,
    fileOptions?: { name?: string; contentType?: string },
  ): Promise<this>;
  setPublicKey(publicKey: string): Promise<this>;
  setPassword(currentPassword: string, newPassword: string): Promise<this>;
  fetchSessions(): Promise<SessionInfo[]>;
  revokeSession(sessionId: string): Promise<void>;
}

export class House extends Base {
  id: string;
  name: string;
  iconUrl: string | null;
  accent: string | null;
  ownerId: string;
  createdAt: string | null;
  rooms: RoomManager;
  members: MemberManager;
  roles: RoleManager;
  invites: InviteManager;
  readonly owner: User | null;
  readonly isOwner: boolean;
  edit(data: { name?: string; iconUrl?: string | null }): Promise<House>;
  setName(name: string): Promise<House>;
  setIcon(iconUrl: string | null): Promise<House>;
  delete(): Promise<void>;
  leave(): Promise<void>;
  createRoom(name: string, options?: { type?: RoomType }): Promise<Room>;
  createRole(data: { name: string; color?: string | null; permissions?: PermissionResolvable }): Promise<Role>;
  createInvite(options?: { expiresInMinutes?: number | null; maxUses?: number | null }): Promise<Invite>;
  fetchMembers(): Promise<Collection<string, Member>>;
  fetchRooms(): Promise<Collection<string, Room>>;
  fetchRoles(): Promise<Collection<string, Role>>;
  fetchInvites(): Promise<Collection<string, Invite>>;
  fetchVoiceStates(): Promise<Array<{ roomId: string; users: VoiceOccupant[] }>>;
  toString(): string;
}

export class Room extends Base {
  id: string;
  houseId: string;
  name: string;
  type: RoomType;
  topic: string | null;
  position: number;
  createdAt: string | null;
  messages: MessageManager;
  readonly house: House | null;
  isText(): boolean;
  isVoice(): boolean;
  isPortal(): boolean;
  subscribe(): this;
  unsubscribe(): this;
  send(content: string | MessagePayload): Promise<Message>;
  sendTyping(): this;
  stopTyping(): this;
  fetchMessages(options?: { cursor?: string; limit?: number }): Promise<{ messages: Message[]; nextCursor: string | null }>;
  fetchPins(): Promise<Message[]>;
  edit(data: { name?: string; topic?: string | null }): Promise<Room>;
  setName(name: string): Promise<Room>;
  setTopic(topic: string | null): Promise<Room>;
  clone(): Promise<Room>;
  delete(): Promise<void>;
  fetchPermissionOverrides(): Promise<PermissionOverride[]>;
  setPermissionOverride(
    role: string | Role,
    options: { allow?: PermissionResolvable; deny?: PermissionResolvable },
  ): Promise<void>;
  toString(): string;
}

export class TextRoom extends Room {}
export class PortalRoom extends Room {}

export class VoiceRoom extends Room {
  join(): Promise<{ selfSocketId: string; participants: Array<{ socketId: string; userId: string; muted: boolean }> }>;
  leave(): this;
  setVoiceState(state: { muted: boolean; deafened?: boolean }): this;
  signal(toSocketId: string, data: unknown): this;
}

export function createRoom(client: Client, data: any): Room;

export class ReactionGroup {
  readonly client: Client;
  readonly message: Message;
  emoji: string;
  count: number;
  userIds: string[];
  readonly me: boolean;
  readonly users: User[];
  toJSON(): { emoji: string; count: number; userIds: string[] };
}

export class Message extends Base {
  id: string;
  roomId: string | null;
  dmChannelId: string | null;
  houseId: string | null;
  content: string;
  clientNonce: string | null;
  pinned: boolean;
  createdAt: string;
  editedAt: string | null;
  authorId: string;
  reactions: ReactionGroup[];
  readonly author: User | null;
  readonly channel: Room | DMChannel | null;
  readonly room: Room | null;
  readonly createdTimestamp: number | null;
  readonly edited: boolean;
  reply(content: string | MessagePayload): Promise<Message>;
  edit(content: string): Promise<Message>;
  delete(): Promise<Message>;
  pin(): Promise<Message>;
  unpin(): Promise<Message>;
  react(emoji: string): Promise<Message>;
  unreact(emoji: string): Promise<Message>;
  toString(): string;
}

export class Member extends Base {
  id: string;
  houseId: string;
  nickname: string | null;
  roleIds: string[];
  status: PresenceStatusType;
  readonly user: User | null;
  readonly house: House | null;
  readonly displayName: string | null;
  readonly isOwner: boolean;
  readonly roles: Collection<string, Role>;
  readonly permissions: PermissionsBitField;
  setRoles(roles: Array<string | Role>): Promise<Member>;
  addRole(...roles: Array<string | Role>): Promise<Member>;
  removeRole(...roles: Array<string | Role>): Promise<Member>;
  toString(): string;
}

export class Role extends Base {
  id: string;
  houseId: string;
  name: string;
  color: string | null;
  permissions: PermissionsBitField;
  position: number;
  isDefault: boolean;
  hoist: boolean;
  readonly house: House | null;
  edit(data: { name?: string; color?: string | null; permissions?: PermissionResolvable; hoist?: boolean }): Promise<Role>;
  setName(name: string): Promise<Role>;
  setColor(color: string | null): Promise<Role>;
  setPermissions(permissions: PermissionResolvable): Promise<Role>;
  setHoist(hoist: boolean): Promise<Role>;
  delete(): Promise<void>;
  toString(): string;
}

export class DMChannel extends Base {
  id: string;
  participantIds: string[];
  messages: MessageManager;
  readonly participants: User[];
  readonly recipient: User | null;
  isDM(): true;
  send(content: string | MessagePayload): Promise<Message>;
  sendTyping(): this;
  stopTyping(): this;
  fetchMessages(options?: { cursor?: string; limit?: number }): Promise<{ messages: Message[]; nextCursor: string | null }>;
  toString(): string;
}

export class Invite extends Base {
  id?: string;
  code: string;
  uses?: number;
  maxUses?: number | null;
  expiresAt: string | null;
  createdAt?: string;
  houseId?: string;
  house?: { id: string; name: string; iconUrl: string | null; accent: string | null };
  inviter?: { handle: string; displayName: string };
  readonly expired: boolean;
  redeem(): Promise<House>;
  delete(): Promise<void>;
  toString(): string;
}

export class VoiceState {
  constructor(client: Client, data: { userId: string; muted?: boolean; deafened?: boolean; socketId?: string; roomId?: string });
  readonly client: Client;
  userId: string;
  roomId: string | null;
  socketId: string | null;
  muted: boolean;
  deafened: boolean;
  readonly user: User | null;
  toJSON(): { userId: string; roomId: string | null; socketId: string | null; muted: boolean; deafened: boolean };
}

// ---------------------------------------------------------------------------
// Managers
// ---------------------------------------------------------------------------

export abstract class CachedManager<V> {
  readonly client: Client;
  readonly holds: Function;
  cache: Collection<string, V>;
  resolve(idOrInstance: string | { id: string }): V | null;
  resolveId(idOrInstance: string | { id: string }): string;
  [Symbol.iterator](): IterableIterator<V>;
}

export class HouseManager extends CachedManager<House> {
  fetch(id: string, options?: { force?: boolean }): Promise<House>;
  fetch(): Promise<Collection<string, House>>;
  create(name: string): Promise<House>;
}

export class ChannelManager extends CachedManager<Room> {
  fetch(id: string, options?: { force?: boolean }): Promise<Room | null>;
}

export class RoomManager extends CachedManager<Room> {
  readonly house: House;
  fetch(): Promise<Collection<string, Room>>;
  create(name: string, options?: { type?: RoomType }): Promise<Room>;
  reorder(orderedIds: Array<string | Room>): Promise<Collection<string, Room>>;
}

export class UserManager extends CachedManager<User> {
  fetch(id: string, options?: { force?: boolean }): Promise<User>;
  search(query?: string): Promise<User[]>;
}

export class MessageManager extends CachedManager<Message> {
  readonly channel: Room | DMChannel;
  readonly isDM: boolean;
  fetch(options?: { cursor?: string; limit?: number }): Promise<{ messages: Message[]; nextCursor: string | null }>;
  fetchPins(): Promise<Message[]>;
  send(content: string | MessagePayload): Promise<Message>;
}

export class MemberManager extends CachedManager<Member> {
  readonly house: House;
  fetch(id: string, options?: { force?: boolean }): Promise<Member | null>;
  fetch(): Promise<Collection<string, Member>>;
}

export class RoleManager extends CachedManager<Role> {
  readonly house: House;
  readonly everyone: Role | null;
  fetch(): Promise<Collection<string, Role>>;
  create(data: { name: string; color?: string | null; permissions?: PermissionResolvable }): Promise<Role>;
  reorder(orderedIds: Array<string | Role>): Promise<Collection<string, Role>>;
}

export class DMManager extends CachedManager<DMChannel> {
  fetch(): Promise<Collection<string, DMChannel>>;
  create(user: string | User): Promise<DMChannel>;
}

export class FriendManager {
  readonly client: Client;
  cache: Collection<string, User>;
  fetch(): Promise<Collection<string, User>>;
  fetchPending(): Promise<{ incoming: Array<{ id: string; user: User }>; outgoing: Array<{ id: string; user: User }> }>;
  add(handle: string): Promise<{ accepted: boolean; user: User }>;
  accept(requestId: string): Promise<void>;
  decline(requestId: string): Promise<void>;
  remove(user: string | User): Promise<void>;
}

export class InviteManager extends CachedManager<Invite> {
  readonly house: House;
  fetch(): Promise<Collection<string, Invite>>;
  create(options?: { expiresInMinutes?: number | null; maxUses?: number | null }): Promise<Invite>;
}

// ---------------------------------------------------------------------------
// Client & events
// ---------------------------------------------------------------------------

export interface TypingStartData {
  userId: string;
  handle: string;
  user: User | null;
  roomId: string | null;
  dmChannelId: string | null;
  typing: boolean;
}

export interface PresenceUpdateData {
  userId: string;
  status: PresenceStatusType;
  user: User | null;
}

export interface ReactionUpdateData {
  messageId: string;
  roomId: string | null;
  dmChannelId: string | null;
  reactions: ReactionGroup[] | Array<{ emoji: string; count: number; userIds: string[] }>;
  message: Message | null;
}

export interface MentionData {
  houseId: string;
  roomId: string;
  message: Message;
}

export interface ClientEvents {
  ready: [client: Client];
  debug: [message: string];
  warn: [message: string];
  error: [error: Error];
  raw: [event: string, data: any];
  disconnect: [reason: string];
  messageCreate: [message: Message];
  messageUpdate: [oldMessage: Message | null, newMessage: Message];
  messageDelete: [message: Message | { id: string; roomId: string | null; dmChannelId: string | null }];
  messagePinUpdate: [data: { roomId: string; messageId: string; pinned: boolean; message: Message | null }];
  messageReactionUpdate: [data: ReactionUpdateData];
  typingStart: [data: TypingStartData];
  presenceUpdate: [data: PresenceUpdateData];
  mention: [data: MentionData];
  roomCreate: [room: Room];
  roomUpdate: [oldRoom: Room | null, newRoom: Room | { houseId: string }];
  roomDelete: [room: Room | { roomId: string; houseId: string }];
  roomsReorder: [data: { houseId: string }];
  houseUpdate: [data: { houseId: string; house: House | null }];
  houseDelete: [house: House | { houseId: string }];
  memberJoin: [data: { houseId: string; userId: string }];
  membersUpdate: [data: { houseId: string }];
  rolesUpdate: [data: { houseId: string }];
  friendRequest: [data: { id: string; user: User | null }];
  friendAccepted: [data: { user: User | null }];
  friendRemoved: [data: { userId: string }];
  voicePeerJoin: [state: VoiceState];
  voicePeerLeave: [data: { socketId: string }];
  voicePeerUpdate: [state: VoiceState];
  voiceRoomState: [data: { roomId: string; users: VoiceState[] }];
  voiceSignal: [data: { fromSocketId: string; fromUserId: string; data: unknown }];
  sessionRevoked: [data: { sessionId: string }];
}

export class Client extends EventEmitter {
  constructor(options?: ClientOptions);
  options: Required<ClientOptions>;
  rest: REST;
  gateway: Gateway;
  user: ClientUser | null;
  ready: boolean;
  houses: HouseManager;
  channels: ChannelManager;
  users: UserManager;
  dms: DMManager;
  friends: FriendManager;
  readonly token: string | null;
  readonly connected: boolean;

  login(token: string | { token: string }): Promise<string>;
  resetToken(): Promise<string>;
  logout(): Promise<void>;
  destroy(): void;
  fetchInvite(code: string): Promise<Invite>;
  redeemInvite(code: string): Promise<House>;
  fetchSubscription(): Promise<any>;
  static requestToken(opts: RequestTokenOptions): Promise<string>;

  on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
  once<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
  off<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
  emit<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): boolean;
}

// ---------------------------------------------------------------------------
// Routes & constants
// ---------------------------------------------------------------------------

export const Routes: {
  register(): string;
  login(): string;
  loginTwoFactor(): string;
  twoFactorSetup(): string;
  twoFactorEnable(): string;
  twoFactorDisable(): string;
  refresh(): string;
  logout(): string;
  tokens(): string;
  tokensReset(): string;
  sessions(): string;
  session(id: string): string;
  authMe(): string;
  forgotPassword(): string;
  resetPassword(): string;
  me(): string;
  userSearch(): string;
  user(id: string): string;
  houses(): string;
  house(houseId: string): string;
  houseLeave(houseId: string): string;
  houseMembers(houseId: string): string;
  memberRoles(houseId: string, userId: string): string;
  houseRoles(houseId: string): string;
  houseRolesReorder(houseId: string): string;
  role(roleId: string): string;
  houseRooms(houseId: string): string;
  houseRoomsReorder(houseId: string): string;
  room(roomId: string): string;
  roomClone(roomId: string): string;
  roomMessages(roomId: string): string;
  roomPins(roomId: string): string;
  roomPin(roomId: string, messageId: string): string;
  roomPermissions(roomId: string): string;
  roomPermission(roomId: string, roleId: string): string;
  houseKeysSelf(houseId: string): string;
  houseKeysMembers(houseId: string): string;
  houseKeys(houseId: string): string;
  dms(): string;
  dmMessages(dmId: string): string;
  houseInvites(houseId: string): string;
  invite(code: string): string;
  inviteRedeem(code: string): string;
  inviteRevoke(id: string): string;
  friends(): string;
  friendsPending(): string;
  friendAccept(id: string): string;
  friendDecline(id: string): string;
  friendRemove(userId: string): string;
  uploads(): string;
  subscription(): string;
  checkout(): string;
  portal(): string;
};

export const Events: {
  readonly Ready: 'ready';
  readonly Debug: 'debug';
  readonly Error: 'error';
  readonly Warn: 'warn';
  readonly Raw: 'raw';
  readonly Connecting: 'connecting';
  readonly Reconnecting: 'reconnecting';
  readonly Disconnect: 'disconnect';
  readonly MessageCreate: 'messageCreate';
  readonly MessageUpdate: 'messageUpdate';
  readonly MessageDelete: 'messageDelete';
  readonly MessagePinUpdate: 'messagePinUpdate';
  readonly MessageReactionUpdate: 'messageReactionUpdate';
  readonly TypingStart: 'typingStart';
  readonly PresenceUpdate: 'presenceUpdate';
  readonly Mention: 'mention';
  readonly RoomCreate: 'roomCreate';
  readonly RoomUpdate: 'roomUpdate';
  readonly RoomDelete: 'roomDelete';
  readonly RoomsReorder: 'roomsReorder';
  readonly HouseUpdate: 'houseUpdate';
  readonly HouseDelete: 'houseDelete';
  readonly MemberJoin: 'memberJoin';
  readonly MembersUpdate: 'membersUpdate';
  readonly RolesUpdate: 'rolesUpdate';
  readonly FriendRequest: 'friendRequest';
  readonly FriendAccepted: 'friendAccepted';
  readonly FriendRemoved: 'friendRemoved';
  readonly VoicePeerJoin: 'voicePeerJoin';
  readonly VoicePeerLeave: 'voicePeerLeave';
  readonly VoicePeerUpdate: 'voicePeerUpdate';
  readonly VoiceRoomState: 'voiceRoomState';
  readonly VoiceSignal: 'voiceSignal';
  readonly SessionRevoked: 'sessionRevoked';
};

export const GatewayDispatch: Record<string, string>;
export const GatewayCommand: Record<string, string>;
export const RoomTypes: { readonly Text: 'text'; readonly Voice: 'voice'; readonly Portal: 'portal' };
export const PresenceStatus: { readonly Online: 'online'; readonly Idle: 'idle'; readonly DnD: 'dnd'; readonly Offline: 'offline' };
export const FriendStatus: { readonly Self: 'self'; readonly None: 'none'; readonly Friends: 'friends'; readonly Incoming: 'incoming'; readonly Outgoing: 'outgoing' };
export const DefaultOptions: Omit<ClientOptions, 'token'>;
export const REFRESH_COOKIE: string;
export const version: string;

// Utilities
export function generateNonce(): string;
export function decodeJwt(token: string): Record<string, any> | null;
export function makeQuery(query?: Record<string, unknown>): string;
export function trimTrailingSlash(url: string): string;
export function resolveId(value: string | { id: string }): string;
