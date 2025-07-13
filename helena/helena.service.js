import { GoogleGenAI } from "@google/genai";
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const FILE = './data/history.json';

const ai = new GoogleGenAI({});

let config = {
  thinkingConfig: {
    thinkingBudget: 0,
  },
  systemInstruction: "Você é uma assistente de sistema. Seu nome é Helena.",
}

export async function handleMessage(mensagem, conversaId) {
  if (mensagem?.config?.pesquisa) return searchGoogle(mensagem.text, conversaId);

  if (mensagem?.config?.reflexao) {
    config.thinkingConfig.thinkingBudget = 1;
  } else {
    config.thinkingConfig.thinkingBudget = 0;
  }

  const contexto = buscarConversaPorId(conversaId, true) || [];

  const historicoTexto = contexto.map(msg =>
    `Usuário: ${msg.mensagem}\nHelena: ${typeof msg.resposta === 'string' ? msg.resposta : msg.resposta.response}`
  ).join('\n\n');

  const promptFinal = `Histórico da conversa:\n${historicoTexto}\n\nNova pergunta:\n${mensagem.text}`;

  const analise = await interpretarMensagem(mensagem.text);

  if (analise.executar && analise.comando) {
    const resultado = await executarComandoDireto(analise.comando);
    const respostaFinal = await montarRespostaComResultado(mensagem.text, analise.comando, resultado);

    registrarMensagemNaConversa(conversaId, mensagem.text, respostaFinal);
    return { response: respostaFinal };
  }

  const resposta = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: promptFinal,
    config
  });

  const texto = resposta.text;

  registrarMensagemNaConversa(conversaId, mensagem.text, texto);

  return texto;
}

async function searchGoogle(content, conversaId) {
  const groundingTool = {
    googleSearch: {},
  };

  const config = {
    tools: [groundingTool],
  };

  const historicoTexto = contexto.map(msg =>
    `Usuário: ${msg.mensagem}\nHelena: ${typeof msg.resposta === 'string' ? msg.resposta : msg.resposta.response}`
  ).join('\n\n');

  const promptFinal = `Histórico da conversa:\n${historicoTexto}\n\nNova pergunta:\n${mensagem.text}`;


  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: promptFinal,
    config,
  });

  const candidate = response.candidates[0];

  const text = candidate.content.parts[0].text;

  const fontes = candidate.groundingMetadata.groundingChunks
    ?.filter(chunk => chunk.web)
    .map(chunk => ({
      titulo: chunk.web.title,
      url: chunk.web.uri
    })) || [];

  const search = candidate.groundingMetadata.webSearchQueries || [];
  const resp = {
    response: text,
    fontes,
    search
  };
  registrarMensagemNaConversa(conversaId, content, resp);

  return resp;
}

async function interpretarMensagem(mensagem) {
  const prompt = [
    {
      role: "user",
      parts: [{
        text: `
Você é um analisador de comandos Linux. Sua tarefa é interpretar se uma frase tem intenção de executar um comando de terminal.

Frase: "${mensagem}"

Se a frase for interpretada como um comando, responda APENAS o seguinte JSON (sem explicações):

{
  "executar": true,
  "comando": "date"
}

ou

{
  "executar": true,
  "comando":"firefox"
}

Se não for comando, retorne:

{
  "executar": false,
  "comando": ""
}
`
      }]
    }
  ];

  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  try {
    const textoLimpo = resp.text.match(/\{[\s\S]*?\}/)?.[0];
    return JSON.parse(textoLimpo);
  } catch (e) {
    console.error('Erro ao interpretar JSON da IA:', e.message, resp.text);
    return { executar: false, comando: "" };
  }
}

function executarComandoDireto(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return resolve(`Erro: ${err.message}`);
      if (stderr) return resolve(`Stderr: ${stderr}`);
      resolve(stdout);
    });
  });
}

async function montarRespostaComResultado(mensagemOriginal, comandoExecutado, resultado) {
  const prompt = [
    {
      role: "user",
      parts: [{
        text: `Você é a assistente virtual Helena. Sua missão é gerar uma resposta simples, amigável e direta ao usuário, explicando que executou um comando Linux com sucesso.

Formato:
- Use <p> para parágrafos
- Mostre o resultado do comando dentro de uma tag <pre>
- Não adicione nenhuma marcação Markdown ou HTML fora do <p> ou <pre>

Exemplo de resposta correta:
<p>Prontinho! Aqui está a saída do comando que você pediu:</p>
<pre>conteúdo do terminal aqui</pre>

Agora gere a resposta para:
Frase original: "${mensagemOriginal}"  
Comando executado: ${comandoExecutado}  
Saída do comando:

${resultado}`

      }]
    }
  ];

  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const response = limparResposta(resp.text)
  return response;
}

function limparResposta(texto) {
  return texto
    .replace(/^```(html|json)?/gm, '')
    .replace(/```$/gm, '')
    .trim();
}

function lerHistorico() {
  if (!fs.existsSync(FILE)) return [];

  const data = fs.readFileSync(FILE, 'utf-8').trim();
  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao ler JSON do histórico:', err.message);
    return [];
  }
}

function salvarHistorico(historico) {
  fs.writeFileSync(FILE, JSON.stringify(historico, null, 2));
}

function registrarMensagemNaConversa(conversaId, mensagem, resposta) {
  const historico = lerHistorico();

  const conversa = historico.find(c => c.id === conversaId);
  if (!conversa) return;

  if (!Array.isArray(conversa.mensagens)) {
    conversa.mensagens = [];
  }

  conversa.mensagens.push({
    mensagem,
    resposta,
    timestamp: new Date().toISOString()
  });

  salvarHistorico(historico);
}

export function listarHistorico() {
  return lerHistorico();
}

function garantirArquivoDeHistorico() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, '[]');
  }
}

garantirArquivoDeHistorico();

export function criarConversa(nome = null) {
  const historico = lerHistorico();
  const nova = {
    id: uuidv4(),
    nome: nome || `Conversa ${historico.length + 1}`,
    mensagens: []
  };
  historico.push(nova);
  salvarHistorico(historico);
  return nova;
}

export function listarConversas() {
  return lerHistorico().map(c => ({
    id: c.id,
    nome: c.nome,
    ultima: c.mensagens.at(-1)?.mensagem ?? ''
  }));
}

export function buscarConversaPorId(conversaId, ultimas = false) {
  const historico = lerHistorico();
  const conversa = historico.find(c => c.id === conversaId);
  if (!conversa) return null;

  if (ultimas) {
    return Array.isArray(conversa?.mensagens)
      ? conversa.mensagens.slice(-10)
      : [];
  }

  return conversa;
}

