-- Online Movie Ticket Booking System (MySQL)

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Drop order: child -> parent (safe for re-runs)
DROP TABLE IF EXISTS PAYMENT;
DROP TABLE IF EXISTS TICKET;
DROP TABLE IF EXISTS BOOKING;
DROP TABLE IF EXISTS SHOW_SEAT;
DROP TABLE IF EXISTS SHOWS;
DROP TABLE IF EXISTS SEAT;
DROP TABLE IF EXISTS SCREEN;
DROP TABLE IF EXISTS THEATRE;
DROP TABLE IF EXISTS MOVIE;
DROP TABLE IF EXISTS `USER`;

CREATE TABLE `USER` (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE MOVIE (
  movie_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  genre VARCHAR(50),
  language VARCHAR(50),
  duration SMALLINT UNSIGNED, -- minutes
  poster_url VARCHAR(255),
  cast_names VARCHAR(500),
  rating DECIMAL(3,1),                 -- audience score out of 10
  certificate VARCHAR(6),              -- U / UA / A
  release_year SMALLINT UNSIGNED,
  synopsis TEXT,
  PRIMARY KEY (movie_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE THEATRE (
  theatre_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  PRIMARY KEY (theatre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE SCREEN (
  screen_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  theatre_id INT UNSIGNED NOT NULL,
  screen_name VARCHAR(100),
  total_seats SMALLINT UNSIGNED,
  PRIMARY KEY (screen_id),
  KEY idx_screen_theatre_id (theatre_id),
  CONSTRAINT fk_screen_theatre
    FOREIGN KEY (theatre_id)
    REFERENCES THEATRE(theatre_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE SEAT (
  seat_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  screen_id INT UNSIGNED NOT NULL,
  row_num VARCHAR(10) NOT NULL,
  seat_num SMALLINT UNSIGNED NOT NULL,
  type ENUM('Regular','Premium','VIP') NOT NULL DEFAULT 'Regular',
  PRIMARY KEY (seat_id),
  UNIQUE KEY uq_seat_screen_row_seat (screen_id, row_num, seat_num),
  KEY idx_seat_screen_id (screen_id),
  CONSTRAINT fk_seat_screen
    FOREIGN KEY (screen_id)
    REFERENCES SCREEN(screen_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE SHOWS (
  show_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  movie_id INT UNSIGNED NOT NULL,
  screen_id INT UNSIGNED NOT NULL,
  show_date DATE NOT NULL,
  start_time TIME NOT NULL,
  PRIMARY KEY (show_id),
  KEY idx_shows_movie_id (movie_id),
  KEY idx_shows_date_time (show_date, start_time),
  KEY idx_shows_screen_id (screen_id),
  CONSTRAINT fk_shows_movie
    FOREIGN KEY (movie_id)
    REFERENCES MOVIE(movie_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_shows_screen
    FOREIGN KEY (screen_id)
    REFERENCES SCREEN(screen_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE SHOW_SEAT (
  show_seat_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id INT UNSIGNED NOT NULL,
  seat_id INT UNSIGNED NOT NULL,
  status ENUM('Available','Booked') NOT NULL DEFAULT 'Available',
  PRIMARY KEY (show_seat_id),
  UNIQUE KEY uq_show_seat_show_seat (show_id, seat_id),
  KEY idx_show_seat_show_id (show_id),
  KEY idx_show_seat_seat_id (seat_id),
  CONSTRAINT fk_show_seat_show
    FOREIGN KEY (show_id)
    REFERENCES SHOWS(show_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_show_seat_seat
    FOREIGN KEY (seat_id)
    REFERENCES SEAT(seat_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE BOOKING (
  booking_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  show_id INT UNSIGNED NOT NULL,
  booking_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Confirmed','Pending','Cancelled') NOT NULL DEFAULT 'Pending',
  booking_code VARCHAR(16) NULL,                 -- shown on the ticket / encoded in the QR
  promo_code VARCHAR(30) NULL,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  convenience_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  hold_expires_at DATETIME NULL,                 -- seats are held until this moment (Pending only)
  PRIMARY KEY (booking_id),
  UNIQUE KEY uq_booking_code (booking_code),
  KEY idx_booking_user_id (user_id),
  KEY idx_booking_show_id (show_id),
  CONSTRAINT fk_booking_user
    FOREIGN KEY (user_id)
    REFERENCES `USER`(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_booking_show
    FOREIGN KEY (show_id)
    REFERENCES SHOWS(show_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE TICKET (
  ticket_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  show_seat_id INT UNSIGNED NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (ticket_id),
  KEY idx_ticket_booking_id (booking_id),
  KEY idx_ticket_show_seat_id (show_seat_id),
  CONSTRAINT fk_ticket_booking
    FOREIGN KEY (booking_id)
    REFERENCES BOOKING(booking_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ticket_show_seat
    FOREIGN KEY (show_seat_id)
    REFERENCES SHOW_SEAT(show_seat_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE PAYMENT (
  payment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('Card','UPI','NetBanking','Wallet','Cash') NOT NULL,
  status ENUM('Successful','Failed') NOT NULL,
  payment_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reference VARCHAR(40) NULL,                    -- gateway transaction reference
  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payment_booking_id (booking_id),
  KEY idx_payment_booking_id (booking_id),
  CONSTRAINT fk_payment_booking
    FOREIGN KEY (booking_id)
    REFERENCES BOOKING(booking_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Triggers present in your live DB
DROP TRIGGER IF EXISTS update_booking_status;
DROP TRIGGER IF EXISTS prevent_double_booking;
DROP TRIGGER IF EXISTS update_seat_after_ticket;

DELIMITER ;;
CREATE TRIGGER update_booking_status
AFTER INSERT ON PAYMENT
FOR EACH ROW
BEGIN
  IF NEW.status = 'Successful' THEN
    UPDATE BOOKING SET status = 'Confirmed' WHERE booking_id = NEW.booking_id;
  ELSE
    UPDATE BOOKING SET status = 'Cancelled' WHERE booking_id = NEW.booking_id;
  END IF;
END;;
DELIMITER ;

DELIMITER ;;
CREATE TRIGGER prevent_double_booking
BEFORE INSERT ON TICKET
FOR EACH ROW
BEGIN
  DECLARE seat_status VARCHAR(20);

  SELECT status INTO seat_status
  FROM SHOW_SEAT
  WHERE show_seat_id = NEW.show_seat_id;

  IF seat_status = 'Booked' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seat already booked';
  END IF;
END;;
DELIMITER ;

DELIMITER ;;
CREATE TRIGGER update_seat_after_ticket
AFTER INSERT ON TICKET
FOR EACH ROW
BEGIN
  UPDATE SHOW_SEAT
  SET status = 'Booked'
  WHERE show_seat_id = NEW.show_seat_id;
END;;
DELIMITER ;
