import express from 'express';
import helenaRoutes from './helena/helena.routes.js';
import userRoutes from './user/user.routes.js';
import cors from 'cors'

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Rotas

//Helena
app.use('/helena', helenaRoutes);

//Usuario
app.use('/user', userRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
