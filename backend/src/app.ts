import express from 'express';
import dotenv from 'dotenv';
import usuarioRoutes from './routes/usuarioRoutes';
import authRoutes from './routes/authRoutes';
import ifcBuildingRoutes from './routes/ifcBuildingRoutes';
import habitacioRoutes from './routes/habitacioRoutes';
import actiusRoutes from './routes/actiusRoutes';
import consultesRoutes from './routes/consultesRoutes';

dotenv.config();

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ifcbuildings', ifcBuildingRoutes);
app.use('/api', habitacioRoutes);
app.use('/api', actiusRoutes);
app.use('/api', consultesRoutes);

export default app;
