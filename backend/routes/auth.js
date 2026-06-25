const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const router = express.Router();

// Sign up
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email and password (min 6 chars) required' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      throw authError;
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        plan: 'free'
      });

    if (profileError) throw profileError;

    // Generate JWT
    const token = jwt.sign(
      { uid: authData.user.id, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: authData.user.id,
        email,
        plan: 'free'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Signup failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    // Generate JWT
    const token = jwt.sign(
      { uid: data.user.id, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: data.user.id,
        email,
        plan: profile.plan
      }
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Login failed' });
  }
});

module.exports = router;
