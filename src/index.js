import app from './app.js'
import { dbConnect } from './utils/db.js';

const PORT = process.env.PORT || 5000;

dbConnect().then(()=>{
    app.listen(PORT,()=>{
        console.log('Server has started listening to ',PORT)
    })
})
.catch((error)=>{
    console.error('Error Starting the Server')
    console.log(error.message)
})