import * as service from './cart.service.js';
export async function read(req, res) { res.json(await service.read(req.user.id)); }
export async function setItem(req, res) { res.json(await service.setItem(req.user.id, req.body)); }
export async function clear(req, res) { await service.clear(req.user.id); res.status(204).end(); }
