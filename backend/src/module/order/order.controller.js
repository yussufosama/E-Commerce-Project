import * as service from './order.service.js';
export async function quote(req, res) { res.json(await service.quote(req.user.id)); }
export async function checkout(req, res) { res.status(201).json({ order: await service.checkout(req.user.id, req.body, req.get('Idempotency-Key')) }); }
export async function list(req, res) { res.json(await service.list(req.user.id, req.query)); }
export async function get(req, res) { res.json({ order: await service.get(req.user.id, req.params.id) }); }
export async function cancel(req, res) { res.json({ order: await service.changeStatus(req.user.id, req.params.id, { status: 'cancelled' }) }); }
export async function adminList(req, res) { res.json(await service.list(req.user.id, req.query, true)); }
export async function adminGet(req, res) { res.json({ order: await service.get(req.user.id, req.params.id, true) }); }
export async function adminUpdate(req, res) { res.json({ order: await service.changeStatus(req.user.id, req.params.id, req.body, true) }); }
