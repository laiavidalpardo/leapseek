const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const { optimizeCV } = require('../utils/anthropic');
const { extractTextFromPDF } = require('../utils/pdfToText');
const supabase = require('../config/supabase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', auth, upload.single('cv'), async (req, res) => {
  try {
    const { jobUrl, jobText } = req.body;
    const userId = req.user.uid;

    // Validate inputs
    if (!req.file) {
      return res.status(400).json({ error: 'No CV file provided' });
    }

    if (!jobText || jobText.length < 50) {
      return res.status(400).json({ error: 'Job text too short (min 50 chars)' });
    }

    // Get user's plan
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ error: 'User profile not found' });
    }

    // Check usage limits for free tier
    if (profile.plan === 'free') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: usageThisMonth, error: usageError } = await supabase
        .from('usage_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('feature', 'optimize')
        .gte('created_at', thirtyDaysAgo);

      if (!usageError && usageThisMonth.length >= 1) {
        return res.status(403).json({ error: 'Free plan limit reached. Upgrade to Pro to continue.' });
      }
    }

    // Extract text from PDF
    const cvText = await extractTextFromPDF(req.file.buffer);

    if (cvText.length < 100) {
      return res.status(400).json({ error: 'CV text too short or invalid PDF' });
    }

    // Choose model based on plan
    const model = profile.plan === 'free' ? 'claude-3-5-haiku-20241022' : 'claude-sonnet-4-20250514';
    const isPro = profile.plan !== 'free';

    // Call Anthropic
    const result = await optimizeCV(cvText, jobText, isPro, model);

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: userId,
      feature: 'optimize',
      model_used: model,
      status: 'success',
      cost_eur: model.includes('haiku') ? 0.02 : 0.20
    });

    res.json(result);
  } catch (err) {
    console.error(err);

    // Log failed attempt
    if (req.user) {
      await supabase.from('usage_logs').insert({
        user_id: req.user.uid,
        feature: 'optimize',
        status: 'error'
      }).catch(e => console.error('Failed to log error:', e));
    }

    res.status(400).json({ error: err.message || 'Optimization failed' });
  }
});

module.exports = router;
