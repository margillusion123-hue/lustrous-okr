// 后端API与Supabase数据模型设计
// 使用Node.js + Express + supabase-js

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Health Check / Root Route
app.get('/', (req, res) => {
  res.send('Lustrous OKR API Server Running');
});

app.get('/api', (req, res) => {
  res.send('Lustrous OKR API Endpoint');
});

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_KEY in environment variables.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// --- Helpers for Case Conversion ---

const toCamelCase = (obj) => {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

const toSnakeCase = (obj) => {
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = obj[key];
      return acc;
    }, {});
  }
  return obj;
};

// --- Objectives & Key Results ---

// Get all Objectives (with nested KeyResults)
app.get('/api/objectives', async (req, res) => {
  try {
    const { data: objectives, error: objError } = await supabase
      .from('objectives')
      .select('*');

    if (objError) throw objError;

    const { data: krs, error: krError } = await supabase
      .from('key_results')
      .select('*');

    if (krError) throw krError;

    // Nest KRs into Objectives
    const objectivesWithKrs = objectives.map(obj => {
      const objKrs = krs.filter(kr => kr.objective_id === obj.id);
      return {
        ...toCamelCase(obj),
        krs: toCamelCase(objKrs)
      };
    });

    res.json(objectivesWithKrs);
  } catch (error) {
    console.error('Error fetching objectives:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Objective
app.post('/api/objectives', async (req, res) => {
  try {
    const payload = toSnakeCase(req.body);
    // Remove krs if sent, as they are handled separately or ignored here
    delete payload.krs; 
    
    const { data, error } = await supabase
      .from('objectives')
      .insert([payload])
      .select();

    if (error) throw error;
    res.json(toCamelCase(data[0]));
  } catch (error) {
    console.error('Error creating objective:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Objective
app.put('/api/objectives/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = toSnakeCase(req.body);
    delete payload.krs;
    delete payload.id;

    const { data, error } = await supabase
      .from('objectives')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(toCamelCase(data[0]));
  } catch (error) {
    console.error('Error updating objective:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Objective
app.delete('/api/objectives/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('objectives')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting objective:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Key Results ---

// Create KR
app.post('/api/key_results', async (req, res) => {
  try {
    const payload = toSnakeCase(req.body);
    const { data, error } = await supabase
      .from('key_results')
      .insert([payload])
      .select();

    if (error) throw error;
    res.json(toCamelCase(data[0]));
  } catch (error) {
    console.error('Error creating KR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update KR
app.put('/api/key_results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = toSnakeCase(req.body);
    delete payload.id;

    const { data, error } = await supabase
      .from('key_results')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(toCamelCase(data[0]));
  } catch (error) {
    console.error('Error updating KR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete KR
app.delete('/api/key_results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('key_results')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting KR:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Daily Records ---

// Get all Records
app.get('/api/records', async (req, res) => {
  try {
    const { data, error } = await supabase.from('records').select('*');
    if (error) throw error;
    res.json(toCamelCase(data));
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Record
app.post('/api/records', async (req, res) => {
  try {
    const payload = toSnakeCase(req.body);
    const { data, error } = await supabase
      .from('records')
      .insert([payload])
      .select();

    if (error) throw error;
    res.json(toCamelCase(data[0]));
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Record
app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = toSnakeCase(req.body);
    delete payload.id;

    const { data, error } = await supabase
      .from('records')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(toCamelCase(data[0]));
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Record
app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Schedule Items ---

// Get all Schedule Items
app.get('/api/schedule', async (req, res) => {
  try {
    const { data, error } = await supabase.from('schedule_items').select('*');
    if (error) throw error;
    res.json(toCamelCase(data));
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Schedule Item
app.post('/api/schedule', async (req, res) => {
  try {
    const payload = toSnakeCase(req.body);
    const { data, error } = await supabase
      .from('schedule_items')
      .insert([payload])
      .select();

    if (error) throw error;
    res.json(toCamelCase(data[0]));
  } catch (error) {
    console.error('Error creating schedule item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Schedule Item
app.put('/api/schedule/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = toSnakeCase(req.body);
    delete payload.id;

    const { data, error } = await supabase
      .from('schedule_items')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(toCamelCase(data[0]));
  } catch (error) {
    console.error('Error updating schedule item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Schedule Item
app.delete('/api/schedule/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('schedule_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
