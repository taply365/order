import express from 'express';
import multer from "multer";
import controller from '../controller/controller.js';


const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage:storage
})

router.get('/gen-guest-token/:publicCode', controller.genGuestToken);



export default router;