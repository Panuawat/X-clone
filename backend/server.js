import express from 'express';
import authRoutes from './routes/auth.routes.js'
import dotenv from 'dotenv'
import connectMongoDB from './db/connectMongoDB.js';

const app = express();
const PORT = process.env.PORT || 5000

dotenv.config()
console.log(process.env.MONGO_URI);

app.use('/api/auth',authRoutes)

app.listen(8000, () => {
    console.log(`Server is running on port ${PORT}`);
    connectMongoDB()
}) 