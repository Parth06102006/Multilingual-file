import {signup,login,logout} from '../controllers/user.controller.js'
import { authHandler } from '../middlewares/auth.middleware.js';
import {Router} from 'express'

const router = Router();

router.route('/user/signup').post(signup)
router.route('/user/login').post(login)
router.route('/user/logout').post(authHandler,logout)

export default router;