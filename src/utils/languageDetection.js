import axios from 'axios'
import { ApiError } from './ApiError';

export const detectLanguage = async (text)=>{
    try {
        const res = await axios.post('https://libretranslate.com/detect',
            {q:text}
        )
        console.log(res.data)
    } catch (error) {
        console.error(error.message);
        throw new ApiError(500,'Unable to detect the language')
    }
}