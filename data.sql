-- Seed data for the Online Movie Ticket Booking System
-- (More shows for the next 7 days are generated automatically by the backend scheduler.)
-- - 8 users, 12 movies, 4 theatres (Delhi), 8 screens
-- - 40 seats per screen (A-D rows, 1-10)
-- - 12 shows (multiple times + theatres)
-- - SHOW_SEAT populated for all seats for each show
-- - bookings + tickets + payments (Successful and Failed)

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- "Today" in India (IST). Seed dates are relative to it so the demo never goes stale.
SET @today = DATE(CONVERT_TZ(NOW(), '+00:00', '+05:30'));

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
('Aarav Mehta',  'aarav.mehta@example.com',  '+91-98100-11223', '$2b$10$ZLz6YWQ.Ov4/aW/C67myMeFF9aB9q4L3AJp8LHdV177Ym.BwHauwi'),
('Isha Sharma',  'isha.sharma@example.com',  '+91-98710-33445', '$2b$10$ZLz6YWQ.Ov4/aW/C67myMeFF9aB9q4L3AJp8LHdV177Ym.BwHauwi'),
('Kabir Singh',  'kabir.singh@example.com',  '+91-99990-55667', '$2b$10$ZLz6YWQ.Ov4/aW/C67myMeFF9aB9q4L3AJp8LHdV177Ym.BwHauwi'),
('Ananya Gupta', 'ananya.gupta@example.com', '+91-99580-77889', '$2b$10$ZLz6YWQ.Ov4/aW/C67myMeFF9aB9q4L3AJp8LHdV177Ym.BwHauwi'),
('Rohan Verma',  'rohan.verma@example.com',  '+91-98990-99001', '$2b$10$ZLz6YWQ.Ov4/aW/C67myMeFF9aB9q4L3AJp8LHdV177Ym.BwHauwi'),
('Meera Iyer',   'meera.iyer@example.com',   '+91-98188-22110', '$2b$10$ZLz6YWQ.Ov4/aW/C67myMeFF9aB9q4L3AJp8LHdV177Ym.BwHauwi'),
('Arjun Rao',    'arjun.rao@example.com',    '+91-98733-11990', '$2b$10$ZLz6YWQ.Ov4/aW/C67myMeFF9aB9q4L3AJp8LHdV177Ym.BwHauwi'),
('Sana Khan',    'sana.khan@example.com',    '+91-99555-77881', '$2b$10$ZLz6YWQ.Ov4/aW/C67myMeFF9aB9q4L3AJp8LHdV177Ym.BwHauwi');

-- Movies
INSERT INTO MOVIE (title, genre, language, duration, poster_url, cast_names, rating, certificate, release_year, synopsis) VALUES
('Dune: Part Two', 'Sci-Fi', 'English', 166,
 'https://image.tmdb.org/t/p/w342/8b8R8l88Q1FQc57e1vHZAMA0kC0.jpg',
 'Timothée Chalamet, Zendaya, Rebecca Ferguson', 8.5, 'UA', 2024,
 'Paul Atreides joins the Fremen on Arrakis and fights to avenge his family while a prophecy begins to swallow him whole. Epic desert warfare, politics and a love story on a planetary scale.'),
('Oppenheimer', 'Drama', 'English', 180,
 'https://image.tmdb.org/t/p/w342/baf3y8rKkZfT0Hjd3pM5L8W1nQp.jpg',
 'Cillian Murphy, Emily Blunt, Robert Downey Jr.', 8.9, 'A', 2023,
 'The story of the physicist who led the creation of the atomic bomb, and the moral and political fallout that followed him for the rest of his life.'),
('3 Idiots', 'Comedy', 'Hindi', 171,
 'https://image.tmdb.org/t/p/w342/66A9MqXOyVFCssoloscw79z8Tew.jpg',
 'Aamir Khan, R. Madhavan, Sharman Joshi', 8.4, 'UA', 2009,
 'Three engineering college friends chase a free-spirited classmate''s idea that real learning has nothing to do with rank. Hilarious, warm and quietly rebellious.'),
('Gully Boy', 'Drama', 'Hindi', 153,
 'https://image.tmdb.org/t/p/w342/8jYDEdQUU2X6x9wWjzR8sG7pJ2b.jpg',
 'Ranveer Singh, Alia Bhatt, Siddhant Chaturvedi', 7.9, 'UA', 2019,
 'A young man from the lanes of Mumbai turns his anger and poetry into rap, and fights for a place on a stage nobody expected him to reach.'),
('Spider-Man: Into the Spider-Verse', 'Animation', 'English', 117,
 'https://image.tmdb.org/t/p/w342/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
 'Shameik Moore, Jake Johnson, Hailee Steinfeld', 8.4, 'U', 2018,
 'Miles Morales becomes Spider-Man and meets others from parallel worlds. A visually explosive comic-book adventure about finding your own way to wear the mask.'),
('Inception', 'Sci-Fi', 'English', 148,
 'https://image.tmdb.org/t/p/w342/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg',
 'Leonardo DiCaprio, Joseph Gordon-Levitt, Ellen Page', 8.8, 'UA', 2010,
 'A thief who steals secrets from inside dreams is offered one last job: planting an idea instead. Layers of dreams, a ticking clock and a spinning top.'),
('Interstellar', 'Sci-Fi', 'English', 169,
 'https://image.tmdb.org/t/p/w342/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
 'Matthew McConaughey, Anne Hathaway, Jessica Chastain', 8.7, 'UA', 2014,
 'With Earth running out of time, a former pilot leads a crew through a wormhole to find humanity a new home, at the cost of time with his children.'),
('The Dark Knight', 'Action', 'English', 152,
 'https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
 'Christian Bale, Heath Ledger, Aaron Eckhart', 9.0, 'UA', 2008,
 'Batman faces a chaos-loving criminal who forces Gotham to question its heroes. A crime epic about order, sacrifice and how far one man will go.'),
('Zindagi Na Milegi Dobara', 'Drama', 'Hindi', 155,
 'https://image.tmdb.org/t/p/w342/4Cw1p5fA9jH9n1tFoZT3zh7ElBT.jpg',
 'Hrithik Roshan, Farhan Akhtar, Abhay Deol', 8.2, 'UA', 2011,
 'Three friends take a bachelor road trip across Spain, facing fears, secrets and each other, and rediscover what living actually feels like.'),
('Drishyam', 'Thriller', 'Hindi', 163,
 'https://image.tmdb.org/t/p/w342/iP3E1vZXT0z7VqRCGDZk08LMBqG.jpg',
 'Ajay Devgn, Tabu, Shriya Saran', 8.1, 'UA', 2015,
 'An ordinary cable operator will do anything to protect his family after a crime threatens their quiet life. A clever, tense game of wits with the police.'),
('KGF: Chapter 2', 'Action', 'Hindi', 168,
 'https://image.tmdb.org/t/p/w342/tLeJ0gWJbVYfZ1sy6X2G1Q0G4sP.jpg',
 'Yash, Sanjay Dutt, Raveena Tandon', 7.8, 'UA', 2022,
 'Rocky rules the gold fields and grows into a legend, but an empire this big invites powerful enemies. Larger-than-life action with a thunderous soundtrack.'),
('Barbie', 'Comedy', 'English', 114,
 'https://image.tmdb.org/t/p/w342/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg',
 'Margot Robbie, Ryan Gosling, America Ferrera', 7.0, 'UA', 2023,
 'Barbie leaves the perfect pink world for the real one and discovers what it means to be human. A bright, funny and surprisingly thoughtful comedy.');

-- Theatres (Delhi)
INSERT INTO THEATRE (name, location, city) VALUES
('PVR Select Citywalk', 'Select Citywalk, Saket', 'Delhi'),
('INOX Nehru Place',    'Nehru Place Metro Walk, Nehru Place', 'Delhi'),
('Cinepolis Janakpuri', 'Unity One Mall, Janakpuri', 'Delhi'),
('Wave Cinemas Raja Garden', 'Raja Garden', 'Delhi');

-- Screens
INSERT INTO SCREEN (theatre_id, screen_name, total_seats) VALUES
(1, 'Audi 1', 96),
(1, 'Audi 2', 96),
(2, 'Screen 1', 96),
(2, 'Screen 2', 96),
(3, 'Audi 1', 96),
(3, 'Audi 2', 96),
(4, 'Screen 1', 96),
(4, 'Screen 2', 96);

-- Seats: 96 per screen (Rows A-H, seats 1-12)
--   Rows A-C : Regular   (front)
--   Rows D-F : Premium   (middle)
--   Rows G-H : VIP       (back recliners)
INSERT INTO SEAT (screen_id, row_num, seat_num, type)
SELECT
  s.screen_id,
  r.row_num,
  n.seat_num,
  CASE
    WHEN r.ord <= 3 THEN 'Regular'
    WHEN r.ord <= 6 THEN 'Premium'
    ELSE 'VIP'
  END AS type
FROM SCREEN s
CROSS JOIN (
  SELECT 'A' AS row_num, 1 AS ord UNION ALL SELECT 'B', 2 UNION ALL SELECT 'C', 3
  UNION ALL SELECT 'D', 4 UNION ALL SELECT 'E', 5 UNION ALL SELECT 'F', 6
  UNION ALL SELECT 'G', 7 UNION ALL SELECT 'H', 8
) r
CROSS JOIN (
  SELECT 1 AS seat_num UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
  UNION ALL SELECT 11 UNION ALL SELECT 12
) n
ORDER BY s.screen_id, r.ord, n.seat_num;

-- Shows (12)
INSERT INTO SHOWS (movie_id, screen_id, show_date, start_time) VALUES
(1, 1, DATE_ADD(@today, INTERVAL 0 DAY), '10:30:00'),
(6, 2, DATE_ADD(@today, INTERVAL 0 DAY), '13:15:00'),
(2, 3, DATE_ADD(@today, INTERVAL 0 DAY), '18:45:00'),
(8, 4, DATE_ADD(@today, INTERVAL 0 DAY), '21:15:00'),
(3, 5, DATE_ADD(@today, INTERVAL 1 DAY), '11:00:00'),
(9, 6, DATE_ADD(@today, INTERVAL 1 DAY), '14:30:00'),
(4, 7, DATE_ADD(@today, INTERVAL 1 DAY), '17:45:00'),
(10, 8, DATE_ADD(@today, INTERVAL 1 DAY), '20:15:00'),
(5, 1, DATE_ADD(@today, INTERVAL 2 DAY), '10:00:00'),
(7, 3, DATE_ADD(@today, INTERVAL 2 DAY), '13:45:00'),
(11, 6, DATE_ADD(@today, INTERVAL 2 DAY), '18:00:00'),
(12, 2, DATE_ADD(@today, INTERVAL 2 DAY), '21:30:00');

-- Populate SHOW_SEAT for all seats for each show
INSERT INTO SHOW_SEAT (show_id, seat_id, status)
SELECT sh.show_id, st.seat_id, 'Available'
FROM SHOWS sh
JOIN SEAT st ON st.screen_id = sh.screen_id;

-- Bookings
INSERT INTO BOOKING (user_id, show_id, booking_date, status) VALUES
(1, 1,  TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '09:05:00'), 'Pending'),
(2, 2,  TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '12:20:00'), 'Pending'),
(3, 3,  TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '16:10:00'), 'Pending'),
(4, 4,  TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '09:30:00'), 'Pending'),
(5, 5,  TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '20:55:00'), 'Pending'),
(6, 6,  TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '11:05:00'), 'Pending'),
(7, 7,  TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '15:25:00'), 'Pending'),
(8, 8,  TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '19:40:00'), 'Pending'),
(1, 9,  TIMESTAMP(DATE_SUB(@today, INTERVAL 1 DAY), '09:12:00'), 'Pending'),
(2, 10, TIMESTAMP(DATE_SUB(@today, INTERVAL 1 DAY), '12:05:00'), 'Pending'),
(3, 11, TIMESTAMP(DATE_SUB(@today, INTERVAL 1 DAY), '17:12:00'), 'Pending'),
(4, 12, TIMESTAMP(DATE_SUB(@today, INTERVAL 1 DAY), '20:02:00'), 'Pending');

-- Tickets
-- Booking 1 (Show 1): A1, A2, B5
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 1, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 1 AND ((st.row_num='A' AND st.seat_num IN (1,2)) OR (st.row_num='B' AND st.seat_num IN (5)));

-- Booking 2 (Show 2): A5, A6
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 2, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 2 AND st.row_num='A' AND st.seat_num IN (5,6);

-- Booking 3 (Show 3): A3, A4
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 3, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 3 AND st.row_num='A' AND st.seat_num IN (3,4);

-- Booking 4 (Show 4): C7, C8, C9
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 4, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 4 AND st.row_num='C' AND st.seat_num IN (7,8,9);

-- Booking 5 (Show 5): D9, D10
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 5, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 5 AND st.row_num='D' AND st.seat_num IN (9,10);

-- Booking 6 (Show 6): B5, B6
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 6, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 6 AND st.row_num='B' AND st.seat_num IN (5,6);

-- Booking 7 (Show 7): A1, A2, A3
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 7, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 7 AND st.row_num='A' AND st.seat_num IN (1,2,3);

-- Booking 8 (Show 8): D1, D2
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 8, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 8 AND st.row_num='D' AND st.seat_num IN (1,2);

-- Booking 9 (Show 9): B7
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 9, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 9 AND st.row_num='B' AND st.seat_num IN (7);

-- Booking 10 (Show 10): A8, A9
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 10, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 10 AND st.row_num='A' AND st.seat_num IN (8,9);

-- Booking 11 (Show 11): C3, C4
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 11, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 11 AND st.row_num='C' AND st.seat_num IN (3,4);

-- Booking 12 (Show 12): B10
INSERT INTO TICKET (booking_id, show_seat_id, price)
SELECT 12, ss.show_seat_id,
       CASE st.type WHEN 'VIP' THEN 480.00 WHEN 'Premium' THEN 320.00 ELSE 200.00 END
FROM SHOW_SEAT ss
JOIN SEAT st ON st.seat_id = ss.seat_id
WHERE ss.show_id = 12 AND st.row_num='B' AND st.seat_num IN (10);

-- Mark seats as booked for issued tickets (seed-time)
UPDATE SHOW_SEAT ss
JOIN TICKET t ON t.show_seat_id = ss.show_seat_id
SET ss.status = 'Booked';

-- Payments
INSERT INTO PAYMENT (booking_id, amount, method, status, payment_time) VALUES
(1, 1120.00, 'Card', 'Successful', TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '09:06:10')),
(2,  700.00, 'UPI',  'Successful', TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '12:21:40')),
(3, 1040.00, 'UPI',  'Successful', TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '16:11:05')),
(4,  750.00, 'Wallet', 'Failed',   TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '09:31:22')),
(5,  500.00, 'UPI',  'Successful', TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '20:56:15')),
(6,  700.00, 'Card', 'Successful', TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '11:06:10')),
(7, 1560.00, 'UPI',  'Successful', TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '15:26:22')),
(8,  500.00, 'Wallet','Failed',    TIMESTAMP(DATE_SUB(@today, INTERVAL 2 DAY), '19:41:12')),
(9,  350.00, 'Card', 'Successful', TIMESTAMP(DATE_SUB(@today, INTERVAL 1 DAY), '09:13:40')),
(10, 700.00, 'UPI',  'Successful', TIMESTAMP(DATE_SUB(@today, INTERVAL 1 DAY), '12:06:18')),
(11, 500.00, 'Card', 'Successful', TIMESTAMP(DATE_SUB(@today, INTERVAL 1 DAY), '17:13:20')),
(12, 250.00, 'UPI',  'Successful', TIMESTAMP(DATE_SUB(@today, INTERVAL 1 DAY), '20:03:55'));

-- Payment amounts = ticket prices + Rs.20 convenience fee per ticket
UPDATE PAYMENT p
SET p.amount = (SELECT SUM(t.price) + 20 * COUNT(*) FROM TICKET t WHERE t.booking_id = p.booking_id)
WHERE EXISTS (SELECT 1 FROM TICKET t2 WHERE t2.booking_id = p.booking_id);

UPDATE BOOKING SET convenience_fee = 20 * (SELECT COUNT(*) FROM TICKET t WHERE t.booking_id = BOOKING.booking_id);
UPDATE BOOKING SET booking_code = CONCAT('CV', LPAD(booking_id, 6, '0'));

-- Booking statuses (seed-time)
UPDATE BOOKING SET status = 'Confirmed' WHERE booking_id IN (1,2,3,5,6,7,9,10,11,12);
UPDATE BOOKING SET status = 'Cancelled' WHERE booking_id IN (4,8);

-- Cancelled (failed-payment) bookings must not keep their seats: release them like the app does
UPDATE SHOW_SEAT ss
JOIN TICKET t ON t.show_seat_id = ss.show_seat_id
JOIN BOOKING b ON b.booking_id = t.booking_id
SET ss.status = 'Available'
WHERE b.status = 'Cancelled';
DELETE t FROM TICKET t JOIN BOOKING b ON b.booking_id = t.booking_id WHERE b.status = 'Cancelled';

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
