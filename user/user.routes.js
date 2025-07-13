import express from 'express';
import {
  getUser,
  addUser,
  editUser,
  removeUser
} from './user.controller.js';

const router = express.Router();
router.get('/', getUser);
router.post('/', addUser);
router.put('/', editUser);
router.delete('/', removeUser);

export default router;
