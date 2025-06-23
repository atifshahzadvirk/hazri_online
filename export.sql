-- MySQL dump 10.13  Distrib 9.3.0, for Win64 (x86_64)
--
-- Host: localhost    Database: employeedb
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `parent_id` int DEFAULT NULL,
  `type` enum('SM','MA','SI','NMA','Bereich','Muntazim') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (2,'SM',NULL,'SM'),(3,'MA',2,'MA'),(4,'SI',2,'SI'),(5,'NMA Bereich 1',3,'NMA'),(6,'NMA Bereich 2',3,'NMA'),(7,'NMA Bereich 3',3,'NMA'),(8,'NMA Bereich 4',3,'NMA'),(13,'NMA Bereich 8',3,'NMA'),(14,'NMA Bereich 9',3,'NMA'),(15,'Hazri Nigrani',5,'Muntazim'),(16,'Ziafat',5,'Muntazim'),(18,'Muntazim SI',4,'Muntazim'),(63,'APAC',3,'NMA'),(64,'Büro',63,'Muntazim'),(65,'Produktion',63,'Muntazim'),(66,'Ziafat',63,'Muntazim'),(67,'Langr',63,'Muntazim'),(68,'EMEA',3,'NMA'),(69,'Office',68,'Muntazim'),(70,'Tontechnik',68,'Muntazim'),(71,'Lager',68,'Muntazim'),(72,'Nizafat',68,'Muntazim'),(73,'US',3,'NMA'),(74,'Büro',73,'Muntazim'),(75,'Tee',73,'Muntazim'),(76,'Stage',73,'Muntazim'),(77,'Parcham',73,'Muntazim'),(78,'ROW',3,'NMA'),(79,'Tarbiyyat',78,'Muntazim'),(80,'Innen',78,'Muntazim'),(81,'Außen',78,'Muntazim'),(82,'Technik',78,'Muntazim'),(83,'IT',4,'Muntazim'),(84,'Finanzen',4,'Muntazim'),(85,'Personal',4,'Muntazim'),(86,'Marketing',4,'Muntazim');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `role` enum('SM','MA','SI','NMA','Muntazim','Naib Muntazim','Muawin') DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `idNumber` varchar(50) NOT NULL,
  `majlisName` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) DEFAULT NULL,
  `B_Name` varchar(255) DEFAULT NULL,
  `B_Majlis` varchar(255) DEFAULT NULL,
  `printed_on` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=460 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (445,'Sadr Majlis','SM',2,'11111','TestMajlis1','2025-06-13 22:55:53','admin','Thomas Scholl','Berlin','2025-06-20 00:14:09'),(446,'Muntazim-e-Aala','MA',3,'11112','TestMajlis1','2025-06-13 22:56:41','admin','Max Meyer','Frankfurt','2025-06-20 00:14:09'),(447,'Sek Ijtema','SI',4,'11113','TestMajlis1','2025-06-13 22:57:01','admin','Björn Schulz','Darmstadt','2025-06-20 00:14:09'),(448,'NMA1','NMA',5,'11114','TestMajlis1','2025-06-13 22:57:24','admin','Ibrahim Schumacher','Hamburg','2025-06-20 00:14:09'),(449,'NMA2','NMA',6,'11115','TestMajlis1','2025-06-13 22:58:11','admin','Basharat Bach','München','2025-06-20 00:14:09'),(450,'NMA_ROW','NMA',78,'11116','TestMajlis1','2025-06-13 23:03:05','admin','Naveed Ahmad','Dresden','2025-06-20 00:14:09'),(451,'Muntazim','NMA',7,'11117','TestMajlis1','2025-06-13 23:04:18','admin','Masood Reway','Zwickau','2025-06-20 00:14:09'),(452,'Muntazim_2','Muawin',16,'11118','TestMajlis1','2025-06-13 23:08:45','admin','Reinhard Unsinn','Grünberg','2025-06-20 00:14:09'),(453,'Muntazim_2','Muntazim',15,'11119','TestMajlis1','2025-06-13 23:09:09','admin','Wilko Schweizer','Walldorf','2025-06-20 00:14:09'),(454,'Muntazim_3','Naib Muntazim',15,'11120','TestMajlis1','2025-06-13 23:10:14','admin','Patrick Block','Friedberg','2025-06-20 00:14:09'),(455,'NM','Muntazim',65,'11121','TestMajlis1','2025-06-13 23:11:21','admin','Thomas Schmidt','Nidda','2025-06-20 00:14:09'),(456,'MuzaimNEU','Naib Muntazim',15,'11125','Testmajlis','2025-06-15 11:44:40','muntazim','Max Schmitt','Karben','2025-06-20 00:14:09'),(457,'MuawinNEU','Muawin',15,'11122','Testmajlis','2025-06-15 11:45:40','muntazim','Björn Regenthal','Bad Vilbel','2025-06-23 12:52:57'),(459,'TestMuawinNeu','Naib Muntazim',16,'11126','Testmajlis','2025-06-17 01:07:12','muntazim','Naveed Hübner','Berlin','2025-06-20 00:32:20');
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `muntazim`
--

DROP TABLE IF EXISTS `muntazim`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `muntazim` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'muntazim',
  `position` varchar(50) DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `idNumber` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `muntazim_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `muntazim`
--

LOCK TABLES `muntazim` WRITE;
/*!40000 ALTER TABLE `muntazim` DISABLE KEYS */;
INSERT INTO `muntazim` VALUES (5,'admin','$2b$10$QgcsfcLXFxRnTePsy16/WOPRA5UXECgp0GQ5zv2D8yrmvu8mVjqdG','admin',NULL,NULL,''),(8,'muntazim','$2b$10$PbYr5f4fwMzf1gi9fc2M7ebGh16Wf6YVeThcz0JNiu1VWZKkaqkVO','muntazim',NULL,15,''),(29,'admin2','$2b$10$3VagFOFit7ew5dT7XQ8iZuDm1Xbx0qBhDdfOFymu4I6Op3EU51S6i','admin','',NULL,''),(30,'NMA_Bereich1','$2b$10$hUJ4MdRxIXoMn4grMCgojOiagtDSxIghoP4NTiW7qKx0ZCzXVeJ9m','NMA(read-only)','',5,'11150');
/*!40000 ALTER TABLE `muntazim` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-23 13:22:52
