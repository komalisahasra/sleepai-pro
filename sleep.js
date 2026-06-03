const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sleepController');

router.post('/sleep', ctrl.createLog);
router.get('/history', ctrl.getHistory);
router.get('/analysis', ctrl.getAnalysis);
router.get('/insights', ctrl.getInsights);
router.delete('/sleep/:id', ctrl.deleteLog);

module.exports = router;
