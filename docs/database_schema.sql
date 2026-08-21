-- MySQL Script generated for EcoConnect
-- Schema EcoConnectDB
-- -----------------------------------------------------

CREATE SCHEMA IF NOT EXISTS `ecoconnect_db` DEFAULT CHARACTER SET utf8mb4 ;
USE `ecoconnect_db` ;

-- -----------------------------------------------------
-- Table `User`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `User` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(150) NOT NULL,
  `password` VARCHAR(128) NOT NULL,
  `email` VARCHAR(254) NULL,
  `phone_number` VARCHAR(20) NOT NULL UNIQUE,
  `role` VARCHAR(20) NOT NULL DEFAULT 'resident',
  `points` INT NOT NULL DEFAULT 0,
  `barangay` VARCHAR(50) NULL,
  `id_image` VARCHAR(255) NULL,
  `profile_picture` VARCHAR(255) NULL,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `date_joined` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Event`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Event` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `location` VARCHAR(200) NOT NULL,
  `date` VARCHAR(50) NOT NULL,
  `time` VARCHAR(50) NOT NULL,
  `organizer_id` INT NOT NULL,
  `points_reward` INT NOT NULL DEFAULT 10,
  `barangay` VARCHAR(50) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'upcoming',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_Event_Organizer`
    FOREIGN KEY (`organizer_id`)
    REFERENCES `User` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Participation`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Participation` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `event_id` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'joined',
  `verified_at` VARCHAR(50) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_Participation_User`
    FOREIGN KEY (`user_id`)
    REFERENCES `User` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Participation_Event`
    FOREIGN KEY (`event_id`)
    REFERENCES `Event` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Redemption`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Redemption` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `item_name` VARCHAR(100) NOT NULL,
  `points_spent` INT NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_Redemption_User`
    FOREIGN KEY (`user_id`)
    REFERENCES `User` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `TransferRequest`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `TransferRequest` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `source_barangay` VARCHAR(50) NOT NULL,
  `target_barangay` VARCHAR(50) NOT NULL,
  `reason` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_TransferRequest_User`
    FOREIGN KEY (`user_id`)
    REFERENCES `User` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `Expense`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Expense` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `barangay` VARCHAR(50) NOT NULL,
  `amount` FLOAT NOT NULL,
  `description` VARCHAR(200) NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'Spent',
  `date` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `OTPStore`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `OTPStore` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `phone_number` VARCHAR(20) NULL,
  `email` VARCHAR(120) NULL,
  `otp_code` VARCHAR(6) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;
