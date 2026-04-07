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
-- КАТЕГОРИИ БЛЮД
-- ========================
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    meal_type_id INT NOT NULL,
    FOREIGN KEY (meal_type_id) REFERENCES meal_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================
-- БЛЮДА
-- ========================
CREATE TABLE IF NOT EXISTS dishes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INT NOT NULL,
    calories INT DEFAULT NULL,
    price DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================
-- МЕНЮ НА ДЕНЬ (админ создаёт расписание)
-- ========================
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

-- ========================
-- ЗАКАЗЫ УЧЕНИКОВ
-- ========================
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

-- ТРАНЗАКЦИИ (подтверждённые заказы)
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    menu_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ========================

-- Роли: 1=администратор, 2=ученик
INSERT IGNORE INTO roles (id, name) VALUES
(1, 'admin'),
(2, 'student');

-- Администратор по умолчанию (логин: admin, пароль: admin123)
INSERT IGNORE INTO users (username, password_hash, full_name, role_id) VALUES
('admin', SHA2('admin123', 256), 'Администратор', 1);

-- Типы приёмов пищи
INSERT IGNORE INTO meal_types (id, name, default_time) VALUES
(1, 'Завтрак', '09:30:00'),
(2, 'Обед', '12:30:00'),
(3, 'Полдник', '15:30:00');

-- Категории блюд (привязаны к приёмам пищи)
-- Завтрак (meal_type_id=1): Каши, Яичница, Бутерброды
-- Обед (meal_type_id=2): Супы, Вторые блюда, Гарниры
-- Полдник (meal_type_id=3): Выпечка, Десерты, Напитки
INSERT IGNORE INTO categories (id, name, meal_type_id) VALUES
(1, 'Каши', 1),
(2, 'Яичница', 1),
(3, 'Бутерброды', 1),
(4, 'Супы', 2),
(5, 'Вторые блюда', 2),
(6, 'Гарниры', 2),
(7, 'Выпечка', 3),
(8, 'Десерты', 3),
(9, 'Напитки', 3);

-- Блюда (с category_id вместо текста)
INSERT IGNORE INTO dishes (name, category_id, calories, price) VALUES
('Каша овсяная с фруктами', 1, 250, 2.00),
('Рисовая каша', 1, 220, 2.00),
('Каша пшённая с тыквой', 1, 230, 2.00),
('Яичница с помидорами', 2, 300, 3.00),
('Омлет', 2, 280, 3.00),
('Бутерброд с сыром', 3, 200, 2.00),
('Бутерброд с колбасой', 3, 250, 2.50),
('Борщ', 4, 180, 3.00),
('Щи из свежей капусты', 4, 150, 3.00),
('Рассольник', 4, 170, 3.00),
('Котлета с пюре', 5, 420, 4.50),
('Тефтели с гречкой', 5, 380, 4.50),
('Гуляш с макаронами', 5, 450, 4.50),
('Пюре картофельное', 6, 200, 2.00),
('Гречка', 6, 180, 2.00),
('Макароны', 6, 200, 2.00),
('Творожная запеканка', 7, 200, 2.00),
('Блинчики с творогом', 7, 280, 3.00),
('Сырники со сметаной', 7, 310, 2.50),
('Печенье', 8, 180, 1.50),
('Фрукты', 8, 80, 1.50),
('Чай', 9, 0, 0.50),
('Компот', 9, 60, 0.50);

-- Меню на сегодня (пример)
INSERT IGNORE INTO daily_menu (menu_date, meal_type_id, dish_id) VALUES
(CURDATE(), 1, 1),
(CURDATE(), 2, 8),
(CURDATE(), 2, 11),
(CURDATE(), 3, 17);
