import { handleMessage, listarHistorico, buscarConversaPorId, criarConversa } from './helena.service.js';

export async function sendMessage(req, res) {
  let conversaId = req.params.id;
  const mensagem = req.body;

  // Se não tem conversaId, cria uma nova
  if (!conversaId) {
    const nova = criarConversa();
    conversaId = nova.id;
  }

  const response = await handleMessage(mensagem, conversaId);
  res.json({ response, conversaId });
}

export function getHistorico(req, res) {
  const { q, data } = req.query;
  let historico = listarHistorico();

  if (q) {
    historico = historico.filter(h =>
      h.mensagem.toLowerCase().includes(q.toLowerCase()) ||
      h.resposta.toLowerCase().includes(q.toLowerCase())
    );
  }

  if (data) {
    historico = historico.filter(h => h.timestamp.startsWith(data));
  }

  res.json(historico.reverse());
}

export function getHistoricoPorConversa(req, res) {
  const conversaId = req.params.id;
  const conversa = buscarConversaPorId(conversaId);
  if (!conversa) return res.status(404).json({ error: 'Conversa não encontrada' });
  res.json(conversa);
}
