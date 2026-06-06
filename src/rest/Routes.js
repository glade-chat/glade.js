'use strict';

/**
 * Builders for every Glade REST endpoint. Each returns a path *relative to the
 * version prefix*, e.g. `Routes.login()` → `/auth/login`, which the
 * {@link REST} client expands to `<base>/<version>/auth/login`.
 */
export const Routes = {
  // --- Auth ---
  register: () => '/auth/register',
  login: () => '/auth/login',
  loginTwoFactor: () => '/auth/login/2fa',
  twoFactorSetup: () => '/auth/2fa/setup',
  twoFactorEnable: () => '/auth/2fa/enable',
  twoFactorDisable: () => '/auth/2fa/disable',
  refresh: () => '/auth/refresh',
  logout: () => '/auth/logout',
  tokens: () => '/auth/tokens',
  tokensReset: () => '/auth/tokens/reset',
  sessions: () => '/auth/sessions',
  session: (id) => `/auth/sessions/${id}`,
  authMe: () => '/auth/me',
  forgotPassword: () => '/auth/forgot',
  resetPassword: () => '/auth/reset',

  // --- Users ---
  me: () => '/users/me',
  userSearch: () => '/users',
  user: (id) => `/users/${id}`,

  // --- Houses ---
  houses: () => '/houses',
  house: (houseId) => `/houses/${houseId}`,
  houseLeave: (houseId) => `/houses/${houseId}/leave`,
  houseMembers: (houseId) => `/houses/${houseId}/members`,
  memberRoles: (houseId, userId) => `/houses/${houseId}/members/${userId}/roles`,

  // --- Roles ---
  houseRoles: (houseId) => `/houses/${houseId}/roles`,
  houseRolesReorder: (houseId) => `/houses/${houseId}/roles/reorder`,
  role: (roleId) => `/roles/${roleId}`,

  // --- Rooms (channels) ---
  houseRooms: (houseId) => `/houses/${houseId}/rooms`,
  houseRoomsReorder: (houseId) => `/houses/${houseId}/rooms/reorder`,
  room: (roomId) => `/rooms/${roomId}`,
  roomClone: (roomId) => `/rooms/${roomId}/clone`,
  roomMessages: (roomId) => `/rooms/${roomId}/messages`,
  roomPins: (roomId) => `/rooms/${roomId}/pins`,
  roomPin: (roomId, messageId) => `/rooms/${roomId}/messages/${messageId}/pin`,
  roomPermissions: (roomId) => `/rooms/${roomId}/permissions`,
  roomPermission: (roomId, roleId) => `/rooms/${roomId}/permissions/${roleId}`,

  // --- E2E house keys ---
  houseKeysSelf: (houseId) => `/houses/${houseId}/keys/self`,
  houseKeysMembers: (houseId) => `/houses/${houseId}/keys/members`,
  houseKeys: (houseId) => `/houses/${houseId}/keys`,

  // --- DMs ---
  dms: () => '/dms',
  dmMessages: (dmId) => `/dms/${dmId}/messages`,

  // --- Invites ---
  houseInvites: (houseId) => `/houses/${houseId}/invites`,
  invite: (code) => `/invites/${code}`,
  inviteRedeem: (code) => `/invites/${code}/redeem`,
  inviteRevoke: (id) => `/invites/${id}`,

  // --- Friends ---
  friends: () => '/friends',
  friendsPending: () => '/friends/pending',
  friendAccept: (id) => `/friends/${id}/accept`,
  friendDecline: (id) => `/friends/${id}/decline`,
  friendRemove: (userId) => `/friends/${userId}`,

  // --- Uploads ---
  uploads: () => '/uploads',

  // --- Billing ---
  subscription: () => '/billing/subscription',
  checkout: () => '/billing/checkout',
  portal: () => '/billing/portal',
};

export default Routes;
