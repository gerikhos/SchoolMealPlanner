-- Создание базы данных
CREATE DATABASE IF NOT EXISTS school_meals CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE school_meals;

-- ========================
-- РОЛИ ПОЛЬЗОВАТЕЛЕЙ
-- ========================
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================
-- ПОЛЬЗОВАТЕЛИ
-- ========================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================
-- ТИПЫ ПРИЁМОВ ПИЩИ
-- ========================
CREATE TABLE IF NOT EXISTS meal_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    default_time TIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================
-- БЛЮДА
-- ========================
CREATE TABLE IF NOT EXISTS dishes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    calories INT DEFAULT NULL,
    price DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- МЕНЮ НА ДЕНЬ (админ создаёт расписание)
CREATE TABLE IF NOT EXISTS daily_menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_date DATE NOT NULL,
    meal_type_id INT NOT NULL,
    dish_id INT NOT NULL,
    created_by INT,
    FOREIGN KEY (meal_type_id) REFERENCES meal_types(id) ON DELETE CASCADE,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_menu (menu_date, meal_type_id, dish_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ЗАКАЗЫ УЧЕНИКОВ
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    menu_date DATE NOT NULL,
    meal_type_id INT NOT NULL,
    dish_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_type_id) REFERENCES meal_types(id) ON DELETE CASCADE,
    FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_order (user_id, menu_date, meal_type_id, dish_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ========================

-- Роли: 1=администратор, 2=ученик
INSERT IGNORE INTO roles (id, name) VALUES
(1, 'admin'),
(2, 'student');

-- Администратор по умолчанию (логин: admin, пароль: admin123)
-- Хеш для 'admin123' через bcrypt: $2b$10$X7V... но для простоты используем md5 в сервере
-- Реальный хеш генерируется на сервере при первом запуске
INSERT IGNORE INTO users (username, password_hash, full_name, role_id) VALUES
('admin', SHA2('admin123', 256), 'Администратор', 1);

-- Типы приёмов пищи
INSERT IGNORE INTO meal_types (id, name, default_time) VALUES
(1, 'Завтрак', '09:30:00'),
(2, 'Обед', '12:30:00'),
(3, 'Полдник', '15:30:00');

-- Блюда (пример)
INSERT IGNORE INTO dishes (name, category, calories, price) VALUES
('Каша овсяная с фруктами', 'Каши', 250, 2.0),
('Борщ', 'Супы', 180, 3.0),
('Котлета с пюре', 'Вторые блюда', 420, 4.5),
('Творожная запеканка', 'Выпечка', 200, 2.0),
('Рисовая каша', 'Каши', 220, 2.0),
('Щи из свежей капусты', 'Супы', 150, 3.0),
('Тефтели с гречкой', 'Вторые блюда', 380, 4.5),
('Блинчики с творогом', 'Выпечка', 280, 3.0),
('Каша пшённая с тыквой', 'Каши', 230, 2.0),
('Рассольник', 'Супы', 170, 3.0),
('Гуляш с макаронами', 'Вторые блюда', 450, 4.5),
('Сырники со сметаной', 'Выпечка', 310, 2.5);

-- Меню на сегодня (пример)
INSERT IGNORE INTO daily_menu (menu_date, meal_type_id, dish_id) VALUES
(CURDATE(), 1, 1),
(CURDATE(), 2, 2),
(CURDATE(), 2, 3),
(CURDATE(), 3, 4);
