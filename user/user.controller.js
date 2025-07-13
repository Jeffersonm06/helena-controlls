import {
  getUser as getUserData,
  createUser,
  updateUser,
  deleteUser
} from './user.service.js';

export function getUser(req, res) {
  const user = getUserData();
  if (!user) return res.status(404).json({ error: "Nenhum usuário encontrado" });
  res.json(user);
}

export function addUser(req, res) {
  try {
    const user = createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export function editUser(req, res) {
  const user = updateUser(req.body);
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  res.json(user);
}

export function removeUser(req, res) {
  const success = deleteUser();
  if (!success) return res.status(404).json({ error: "Usuário não encontrado" });
  res.json({ message: "Usuário removido com sucesso" });
}
