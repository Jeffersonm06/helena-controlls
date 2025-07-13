import fs from 'fs';
const FILE = './data/user.json';

function readUser() {
  if (!fs.existsSync(FILE)) return null;
  const data = fs.readFileSync(FILE);
  return JSON.parse(data);
}

function writeUser(user) {
  fs.writeFileSync(FILE, JSON.stringify(user, null, 2));
}

export function getUser() {
  return readUser();
}

export function createUser(user) {
  const existing = readUser();
  if (existing) {
    throw new Error('Usuário já existe. Use updateUser() se quiser modificar.');
  }
  const newUser = { id: Date.now().toString(), ...user };
  writeUser(newUser);
  return newUser;
}

export function updateUser(updatedData) {
  const existing = readUser();
  if (!existing) return null;
  const updated = { ...existing, ...updatedData };
  writeUser(updated);
  return updated;
}

export function deleteUser() {
  if (!fs.existsSync(FILE)) return false;
  fs.unlinkSync(FILE);
  return true;
}
