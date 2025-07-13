import express from 'express';
import { sendMessage, getHistorico, getHistoricoPorConversa } from './helena.controller.js';

const router = express.Router();

// Caso com ID de conversa (mais comum)
router.post('/conversa/:id/mensagem', sendMessage);

// Caso sem ID → cria nova conversa
router.post('/mensagem', sendMessage);

router.get('/conversa/:id/historico', getHistoricoPorConversa);
router.get('/historico', getHistorico);


export default router;
