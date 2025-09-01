import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { errorHandler } from './middlewares/error.middleware'

dotenv.config({
    path:'./.env'
})

const app = express();

app.use(cors({
    origin:'*'
}))

app.use(express.json())
app.use(express.urlencoded())

app.use(errorHandler);

export default app;