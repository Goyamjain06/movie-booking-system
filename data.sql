-- Seed data for Online Movie Ticket Booking System (Task 3)
-- - 8 users, 12 movies, 4 theatres (Delhi), 8 screens
-- - 40 seats per screen (A-D rows, 1-10)
-- - 12 shows (multiple times + theatres)
-- - SHOW_SEAT populated for all seats for each show
-- - bookings + tickets + payments (Successful and Failed)

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- Temporarily disable triggers during bulk load
DROP TRIGGER IF EXISTS update_booking_status;
DROP TRIGGER IF EXISTS prevent_double_booking;
DROP TRIGGER IF EXISTS update_seat_after_ticket;

DELETE FROM PAYMENT;
DELETE FROM TICKET;
DELETE FROM BOOKING;
DELETE FROM SHOW_SEAT;
DELETE FROM SHOWS;
DELETE FROM SEAT;
DELETE FROM SCREEN;
DELETE FROM THEATRE;
DELETE FROM MOVIE;
DELETE FROM `USER`;

-- Users
INSERT INTO `USER` (name, email, phone, password) VALUES
('Aarav Mehta',  'aarav.mehta@example.com',  '+91-98100-11223', 'hash$aarav'),
('Isha Sharma',  'isha.sharma@example.com',  '+91-98710-33445', 'hash$isha'),
('Kabir Singh',  'kabir.singh@example.com',  '+91-99990-55667', 'hash$kabir'),
('Ananya Gupta', 'ananya.gupta@example.com', '+91-99580-77889', 'hash$ananya'),
('Rohan Verma',  'rohan.verma@example.com',  '+91-98990-99001', 'hash$rohan'),
('Meera Iyer',   'meera.iyer@example.com',   '+91-98188-22110', 'hash$meera'),
('Arjun Rao',    'arjun.rao@example.com',    '+91-98733-11990', 'hash$arjun'),
('Sana Khan',    'sana.khan@example.com',    '+91-99555-77881', 'hash$sana');

-- Movies
INSERT INTO MOVIE (title, genre, language, duration, poster_url, cast_names) VALUES
('Dune: Part Two', 'Sci-Fi', 'English', 166,
 'https://image.tmdb.org/t/p/w342/8b8R8l88Q1FQc57e1vHZAMA0kC0.jpg',
 'Timothée Chalamet, Zendaya, Rebecca Ferguson'),
('Oppenheimer', 'Drama', 'English', 180,
 'https://image.tmdb.org/t/p/w342/baf3y8rKkZfT0Hjd3pM5L8W1nQp.jpg',
 'Cillian Murphy, Emily Blunt, Robert Downey Jr.'),
('3 Idiots', 'Comedy', 'Hindi', 171,
 'https://image.tmdb.org/t/p/w342/66A9MqXOyVFCssoloscw79z8Tew.jpg',
 'Aamir Khan, R. Madhavan, Sharman Joshi'),
('Gully Boy', 'Drama', 'Hindi', 153,
 'https://image.tmdb.org/t/p/w342/8jYDEdQUU2X6x9wWjzR8sG7pJ2b.jpg',
 'Ranveer Singh, Alia Bhatt, Siddhant Chaturvedi'),
('Spider-Man: Into the Spider-Verse', 'Animation', 'English', 117,
 'https://image.tmdb.org/t/p/w342/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
 'Shameik Moore, Jake Johnson, Hailee Steinfeld'),
('Inception', 'Sci-Fi', 'English', 148,
 'https://image.tmdb.org/t/p/w342/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg',
 'Leonardo DiCaprio, Joseph Gordon-Levitt, Ellen Page'),
('Interstellar', 'Sci-Fi', 'English', 169,
 'https://image.tmdb.org/t/p/w342/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
 'Matthew McConaughey, Anne Hathaway, Jessica Chastain'),
('The Dark Knight', 'Action', 'English', 152,
 'https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
 'Christian Bale, Heath Ledger, Aaron Eckhart'),
('Zindagi Na Milegi Dobara', 'Drama', 'Hindi', 155,
 'https://image.tmdb.org/t/p/w342/4Cw1p5fA9jH9n1tFoZT3zh7ElBT.jpg',
 'Hrithik Roshan, Farhan Akhtar, Abhay Deol'),
('Drishyam', 'Thriller', 'Hindi', 163,
 'https://image.tmdb.org/t/p/w342/iP3E1vZXT0z7VqRCGDZk08LMBqG.jpg',
 'Ajay Devgn, Tabu, Shriya Saran'),
('KGF: Chapter 2', 'Action', 'Hindi', 168,
 'https://image.tmdb.org/t/p/w342/tLeJ0gWJbVYfZ1sy6X2G1Q0G4sP.jpg',
 'Yash, Sanjay Dutt, Raveena Tandon'),
('Barbie', 'Comedy', 'English', 114,
 'https://image.tmdb.org/t/p/w342/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg',
 'Margot Robbie, Ryan Gosling, America Ferrera');

-- Theatres (Delhi)
INSERT INTO THEATRE (name, location, city) VALUES
('PVR Select Citywalk', 'Select Citywalk, Saket', 'Delhi'),
('INOX Nehru Place',    'Nehru Place Metro Walk, Nehru Place', 'Delhi'),
('Cinepolis Janakpuri', 'Unity One Mall, Janakpuri', 'Delhi'),
('Wave Cinemas Raja Garden', 'Raja Garden', 'Delhi');

-- Screens
INSERT INTO SCREEN (theatre_id, screen_name, total_seats) VALUES
(1, 'Audi 1', 40),
(1, 'Audi 2', 40),
(2, 'Screen 1', 40),
(2, 'Screen 2', 40),
(3, 'Audi 1', 40),
(3, 'Audi 2', 40),
(4, 'Screen 1', 40),
(4, 'Screen 2', 40);

-- Seats: 40 per screen (Rows A-D, seats 1-10)
INSERT INTO SEAT (screen_id, row_num, seat_num, type)
SELECT
  s.screen_id,
  r.row_num,
  n.seat_num,
  CASE
    WHEN r.row_num = 'A' AND n.seat_num BETWEEN 1 AND 4 THEN 'VIP'
    WHEN r.row_num IN ('A','B') AND n.seat_num BETWEEN 5 AND 8 THEN 'Premium'
    ELSE 'Regular'
  END AS type
FROM SCREEN s
CROSS JOIN (
  SELECT 'A' AS row_num, 1 AS ord
  UNION ALL SELECT 'B', 2
  UNION ALL SELECT 'C', 3
  UNION ALL SELECT 'D', 4
) r
CROSS JOIN (
  SELECT 1 AS seat_num UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
) n
ORDER BY s.screen_id, r.ord, n.seat_num;

-- Shows (12)
INSERT INTO SHOWS (movie_id, screen_id, show_date, start_time) VALUES
(1, 1, '2026-11-14', '10:30:00'),
(6, 2, '2026-11-14', '13:15:00'),
(2, 3, '2026-11-14', '18:45:00'),
(8, 4, '2026-11-14', '21:15:00'),
(3, 5, '2026-11-15', '11:00:00'),
(9, 6, '2026-11-15', '14:30:00'),
(4, 7, '2026-11-15', '17:45:00'),
(10,8, '2026-11-15', '20:15:00'),
(5, 1, '2026-11-16', '10:00:00'),
(7, 3, '2026-11-16', '13:45:00'),
(11,6, '2026-11-16', '18:00:00'),
(12,2, '2026-11-16', '21:30:00');

-- Populate SHOW_SEAT for all seats for each show
INSERT INTO SHOW_SEAT (show_id, seat_id, status)
SELECT sh.show_id, st.seat_id, 'Available'
FROM SHOWS sh
JOIN SEAT st ON st.screen_id = sh.screen_id;

-- Bookings
INSERT INTO BOOKING (user_id, show_id, booking_date, status) VALUES
(1, 1,  '2026-11-13 09:05:00', 'Pending'),
(2, 2,  '2026-11-13 12:20:00', 'Pending'),
(3, 3,  '2026-11-13 16:10:00', 'Pending'),
(4, 4,  '2026-11-13 09:30:00', 'Pending'),
(5, 5,  '2026-11-13 20:55:00', 'Pending'),
(6, 6,  '2026-11-13 11:05:00', 'Pending'),
(7, 7,  '2026-11-13 15:25:00', 'Pending'),
(8, 8,  '2026-11-13 19:40:00', 'Pending'),
(1, 9,  '2026-11-14 09:12:00', 'Pending'),
(2, 10, '2026-11-14 12:05:00', 'Pending'),
(3, 11, '2026-11-14 17:12:00', 'Pending'),
(4, 12, '2026-11-14 20:02:00', 'Pending');

-- Tickets
-- Booking 1 (Show 1): A1, A2, B5
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 1, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 1 AND ((st.row_num='A' AND st.seat_num IN (1,2)) OR (st.row_num='B' AND st.seat_num IN (5)));

-- Booking 2 (Show 2): A5, A6
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 2, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 2 AND st.row_num='A' AND st.seat_num IN (5,6);

-- Booking 3 (Show 3): A3, A4
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 3, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 3 AND st.row_num='A' AND st.seat_num IN (3,4);

-- Booking 4 (Show 4): C7, C8, C9
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 4, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 4 AND st.row_num='C' AND st.seat_num IN (7,8,9);

-- Booking 5 (Show 5): D9, D10
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 5, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 5 AND st.row_num='D' AND st.seat_num IN (9,10);

-- Booking 6 (Show 6): B5, B6
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 6, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 6 AND st.row_num='B' AND st.seat_num IN (5,6);

-- Booking 7 (Show 7): A1, A2, A3
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 7, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 7 AND st.row_num='A' AND st.seat_num IN (1,2,3);

-- Booking 8 (Show 8): D1, D2
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 8, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 8 AND st.row_num='D' AND st.seat_num IN (1,2);

-- Booking 9 (Show 9): B7
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 9, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 9 AND st.row_num='B' AND st.seat_num IN (7);

-- Booking 10 (Show 10): A8, A9
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 10, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 10 AND st.row_num='A' AND st.seat_num IN (8,9);

-- Booking 11 (Show 11): C3, C4
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 11, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 11 AND st.row_num='C' AND st.seat_num IN (3,4);

-- Booking 12 (Show 12): B10
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 12, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 520.00 WHEN 'Premium' THEN 350.00 ELSE 250.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 12 AND st.row_num='B' AND st.seat_num IN (10);

-- Mark seats as booked for issued tickets (seed-time)
UPDATE SHOW_SEAT ss
JOIN TICKET t ON t.show_seat_id = ss.show_seat_id
SET ss.status = 'Booked';

-- Payments
INSERT INTO PAYMENT (booking_id, amount, method, status, payment_time) VALUES
(1, 1120.00, 'Card', 'Successful', '2026-11-13 09:06:10'),
(2,  700.00, 'UPI',  'Successful', '2026-11-13 12:21:40'),
(3, 1040.00, 'UPI',  'Successful', '2026-11-13 16:11:05'),
(4,  750.00, 'Wallet', 'Failed',   '2026-11-13 09:31:22'),
(5,  500.00, 'UPI',  'Successful', '2026-11-13 20:56:15'),
(6,  700.00, 'Card', 'Successful', '2026-11-13 11:06:10'),
(7, 1560.00, 'UPI',  'Successful', '2026-11-13 15:26:22'),
(8,  500.00, 'Wallet','Failed',    '2026-11-13 19:41:12'),
(9,  350.00, 'Card', 'Successful', '2026-11-14 09:13:40'),
(10, 700.00, 'UPI',  'Successful', '2026-11-14 12:06:18'),
(11, 500.00, 'Card', 'Successful', '2026-11-14 17:13:20'),
(12, 250.00, 'UPI',  'Successful', '2026-11-14 20:03:55');

-- Booking statuses (seed-time)
UPDATE BOOKING SET status = 'Confirmed' WHERE booking_id IN (1,2,3,5,6,7,9,10,11,12);
UPDATE BOOKING SET status = 'Cancelled' WHERE booking_id IN (4,8);

-- Triggers for application/runtime behavior
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

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
