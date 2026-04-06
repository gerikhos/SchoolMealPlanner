const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const pool = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ========================
// АВТОРИЗАЦИЯ
// ========================

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Временное хранилище токенов (в продакшене — Redis или БД)
const tokens = {};

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  const { username, password, full_name } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Логин уже занят' });
    }

    const hash = hashPassword(password);
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, full_name, role_id) VALUES (?, ?, ?, 2)',
      [username, hash, full_name]
    );

    const token = generateToken();
    tokens[token] = { userId: result.insertId, role: 'student' };

    res.json({
      success: true,
      token,
      user: { id: result.insertId, username, full_name, role: 'student' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = hashPassword(password);
    const [rows] = await pool.query(
      'SELECT u.id, u.username, u.full_name, r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = ? AND u.password_hash = ?',
      [username, hash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
    }

    const user = rows[0];
    const token = generateToken();
    tokens[token] = { userId: user.id, role: user.role };

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Проверка токена
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, error: 'Не авторизован' });

  const token = authHeader.replace('Bearer ', '');
  const session = tokens[token];
  if (!session) return res.status(401).json({ success: false, error: 'Токен недействителен' });

  try {
    const [rows] = await pool.query(
      'SELECT u.id, u.username, u.full_name, r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
      [session.userId]
    );
    if (rows.length === 0) return res.status(401).json({ success: false });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Выход
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    delete tokens[token];
  }
  res.json({ success: true });
});

// ========================
// УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (только админ)
// ========================

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, error: 'Не авторизован' });
  const token = authHeader.replace('Bearer ', '');
  const session = tokens[token];
  if (!session) return res.status(401).json({ success: false, error: 'Токен недействителен' });
  req.session = session;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.session.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Доступ запрещён' });
  }
  next();
}

// Список пользователей
app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT u.id, u.username, u.full_name, r.name AS role, u.created_at FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.id'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Создать пользователя
app.post('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  const { username, password, full_name, role } = req.body;
  try {
    const [roleRow] = await pool.query('SELECT id FROM roles WHERE name = ?', [role || 'student']);
    if (roleRow.length === 0) return res.status(400).json({ success: false, error: 'Неизвестная роль' });

    const hash = hashPassword(password);
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, full_name, role_id) VALUES (?, ?, ?, ?)',
      [username, hash, full_name, roleRow[0].id]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, error: 'Логин занят' });
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Удалить пользователя
app.delete('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.session.userId) {
    return res.status(400).json({ success: false, error: 'Нельзя удалить себя' });
  }
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ========================
// МЕНЮ
// ========================

// Получить меню на дату
app.get('/api/menu/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT dm.id, dm.menu_date, mt.name AS meal_type, mt.default_time AS meal_time,
              d.id AS dish_id, d.name AS dish_name, d.category, d.calories, d.price
       FROM daily_menu dm
       JOIN meal_types mt ON dm.meal_type_id = mt.id
       JOIN dishes d ON dm.dish_id = d.id
       WHERE dm.menu_date = ?
       ORDER BY mt.id`,
      [date]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Добавить блюдо в меню (только админ)
app.post('/api/menu', authMiddleware, adminMiddleware, async (req, res) => {
  const { menu_date, meal_type_id, dish_id } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT IGNORE INTO daily_menu (menu_date, meal_type_id, dish_id, created_by) VALUES (?, ?, ?, ?)',
      [menu_date, meal_type_id, dish_id, req.session.userId]
    );
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Удалить блюдо из меню (только админ)
app.delete('/api/menu/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM daily_menu WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ========================
// ЗАКАЗЫ УЧЕНИКОВ
// ========================

// Ученик делает заказ (выбирает блюдо на день)
app.post('/api/orders', authMiddleware, async (req, res) => {
  const { menu_date, meal_type_id, dish_id } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO orders (user_id, menu_date, meal_type_id, dish_id) VALUES (?, ?, ?, ?)',
      [req.session.userId, menu_date, meal_type_id, dish_id]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, error: 'Вы уже выбрали это блюдо' });
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Ученик отменяет заказ
app.delete('/api/orders/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM orders WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Получить заказы ученика
app.get('/api/orders/my/:date', authMiddleware, async (req, res) => {
  const { date } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT o.id, o.menu_date, mt.name AS meal_type, mt.default_time AS meal_time,
              d.id AS dish_id, d.name AS dish_name, d.category, d.calories, d.price
       FROM orders o
       JOIN meal_types mt ON o.meal_type_id = mt.id
       JOIN dishes d ON o.dish_id = d.id
       WHERE o.user_id = ? AND o.menu_date = ?
       ORDER BY mt.id`,
      [req.session.userId, date]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Статистика: что выбирали ученики (для админа)
app.get('/api/orders/stats/:date', authMiddleware, async (req, res) => {
  const { date } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.name AS dish_name, d.category, COUNT(*) AS order_count
       FROM orders o
       JOIN dishes d ON o.dish_id = d.id
       WHERE o.menu_date = ?
       GROUP BY d.id, d.name, d.category
       ORDER BY order_count DESC`,
      [date]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ========================
// БЛЮДА
// ========================

app.get('/api/dishes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM dishes ORDER BY category, name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Добавить блюдо (только админ)
app.post('/api/dishes', authMiddleware, adminMiddleware, async (req, res) => {
  const { name, category, calories, price } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO dishes (name, category, calories, price) VALUES (?, ?, ?, ?)',
      [name, category, calories || null, price || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Обновить блюдо (только админ)
app.put('/api/dishes/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, category, calories, price } = req.body;
  try {
    await pool.query(
      'UPDATE dishes SET name = ?, category = ?, calories = ?, price = ? WHERE id = ?',
      [name, category, calories || null, price || null, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Удалить блюдо (только админ)
app.delete('/api/dishes/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM dishes WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

app.get('/api/meal-types', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM meal_types ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ========================
// СТАТИСТИКА
// ========================

// Общая статистика за период
app.get('/api/stats/:week_start/:week_end', async (req, res) => {
  const { week_start, week_end } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT 
         COUNT(*) AS total_meals,
         COALESCE(SUM(d.price), 0) AS total_cost,
         COUNT(DISTINCT dm.menu_date) AS days_with_menu
       FROM daily_menu dm
       JOIN dishes d ON dm.dish_id = d.id
       WHERE dm.menu_date BETWEEN ? AND ?`,
      [week_start, week_end]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Популярность блюд (для админа — круговая диаграмма)
app.get('/api/stats/popular-dishes/:week_start/:week_end', authMiddleware, async (req, res) => {
  const { week_start, week_end } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT d.name, d.category, COUNT(*) AS order_count, COALESCE(SUM(d.price), 0) AS total_price
       FROM daily_menu dm
       JOIN dishes d ON dm.dish_id = d.id
       WHERE dm.menu_date BETWEEN ? AND ?
       GROUP BY d.id, d.name, d.category
       ORDER BY order_count DESC
       LIMIT 10`,
      [week_start, week_end]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
