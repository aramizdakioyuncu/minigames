import { randomUUID } from 'node:crypto';
import { createVision } from './engine/spaceVision.js';

export const newId = prefix => `${prefix}_${randomUUID()}`;
export const cleanText = (value, max, fallback = '') => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max) || fallback : fallback;
export const cleanColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#3b82f6';
export function cleanInput(value) {
  const input = {};
  for (const key of ['up', 'down', 'left', 'right', 'kick', 'hold', 'vent', 'report', 'use']) input[key] = value?.[key] === true;
  return input;
}
export function allowRate(bucket, key, limit, windowMs, now = Date.now()) {
  let entry = bucket.get(key);
  if (!entry || now - entry.start >= windowMs) {
    entry = { start: now, count: 0 };
    bucket.set(key, entry);
  }
  return ++entry.count <= limit;
}
export function originAllowed(req) {
  if (!req.headers.origin) return true; // Native clients do not send browser Origin headers.
  try {
    const origin = new URL(req.headers.origin);
    if (!['http:', 'https:'].includes(origin.protocol)) return false;
    const configured = (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    return configured.length ? configured.includes(origin.origin) : origin.host === req.headers.host;
  } catch { return false; }
}

// Every private field is projected separately for its recipient, before serialization.
export function projectState(packet, viewer, room) {
  const hiddenRoles = ['space', 'vampire'].includes(room.modeType);
  const ended = room.mode.gameState === 'game_over';
  const knowsRole = player => player.id === viewer.id || ended ||
    (room.modeType === 'vampire' && player.isAlive === false) ||
    (viewer.role === player.role && ['vampire', 'impostor'].includes(viewer.role) && !viewer.isSpectator);
  const projectPlayer = player => {
    const result = { ...player };
    if (hiddenRoles && !knowsRole(player)) delete result.role;
    if (hiddenRoles && player.id !== viewer.id) {
      delete result.completedTasksList;
      delete result.hasActed;
      delete result.taskProgress;
      delete result.isDoingTask;
      delete result.isVented;
      delete result.ventId;
      delete result.ventCooldownMs;
      delete result.killCooldown;
      delete result.hunterRevengeAvailable;
    }
    return result;
  };
  const invisible = new Set();
  const limitedVision = room.modeType === 'space' && room.mode.gameState === 'playing' && viewer.isAlive && !viewer.isSpectator;
  const vision = room.modeType === 'space' ? createVision(room.mode,viewer) : null;
  const visiblePoint = point => !limitedVision || !Number.isFinite(point.x) ||
    (Math.hypot(point.x-viewer.pos.x,point.y-viewer.pos.y)<=vision.radius && room.mode.hasLineOfSight(viewer.pos,point));
  if (room.modeType === 'space') {
    for (const p of room.players.values()) {
      if (p.id !== viewer.id && ((p.isVented && !knowsRole(p)) || (!p.isAlive && viewer.isAlive && !viewer.isSpectator) || !visiblePoint(p.pos))) invisible.add(p.id);
    }
  }
  return {
    ...packet,
    hasVotedRestart: room.restartVotes.has(viewer.id),
    players: packet.players.filter(p => !invisible.has(p.id)).map(projectPlayer),
    modeState: {
      ...packet.modeState,
      ...(room.modeType === 'space' ? { vision } : {}),
      ...(packet.modeState.playersMeta ? { playersMeta: packet.modeState.playersMeta.map(projectPlayer) } : {}),
      ...(packet.modeState.bodies ? { bodies: packet.modeState.bodies.filter(visiblePoint).map(({ killerId, ...body }) => body) } : {})
    },
    events: packet.events.filter(event => (!event.recipientId || event.recipientId === viewer.id) &&
      (!['sfx_kill', 'sfx_vent'].includes(event.type) || visiblePoint(event))).map(({ recipientId, killerId, ...event }) => event)
  };
}
