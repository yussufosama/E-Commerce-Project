import * as service from './product.admin.service.js';

export async function list(req, res) { res.json(await service.list(req.query)); }
export async function create(req, res) { res.status(201).json({ product: await service.create(req.body) }); }
export async function update(req, res) { res.json({ product: await service.update(req.params.id, req.body) }); }
export async function inventory(req, res) { res.json({ product: await service.inventory(req.params.id, req.body) }); }
export async function archive(req, res) { res.json({ product: await service.update(req.params.id, { active: false }) }); }
