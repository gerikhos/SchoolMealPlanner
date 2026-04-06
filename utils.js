// ── Укажи IP-адрес своего компьютера (узнай через ipconfig) ──
export const API_BASE = 'http://192.168.100.55:3000/api';

export const formatDate = (date) => {
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export const getDayOfWeek = (date) => {
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  return days[date.getDay()];
};

export const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const mealIcon = (type) => {
  if (type === 'Завтрак') return '🌅';
  if (type === 'Обед') return '☀️';
  if (type === 'Полдник') return '🌤️';
  return '🍽️';
};
