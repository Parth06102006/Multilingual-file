import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { errorHandler } from './middlewares/error.middleware.js'
import helmet from 'helmet'
import hpp from 'hpp'
import mongoSanitize from 'express-mongo-sanitize'
import {xss} from 'express-xss-sanitizer'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import userRoute from './routes/user.route.js'
import pdfRoute from './routes/pdf.route.js'
import questionAnswerRoute from './routes/qanda.route.js'


dotenv.config({
    path:'./.env'
})

const app = express();

app.use(cors({
    origin:'*'
}))

//Security middleware
app.use(helmet());
app.use(mongoSanitize())
app.use(hpp())
app.use(xss());

//Body Parser
app.use(express.json())
app.use(express.urlencoded())
app.use(cookieParser())

app.use('/api/v1',userRoute);
app.use('/api/v1',pdfRoute);
app.use('/api/v1',questionAnswerRoute);

if(process.env.NODE_ENV === 'development')
{
    app.use(morgan('dev'));
}

app.use(errorHandler);

export default app;