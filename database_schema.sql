CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(50) PRIMARY KEY,
  clientName VARCHAR(255),
  projectName VARCHAR(255),
  date VARCHAR(50),
  status VARCHAR(50),
  exchangeRate DECIMAL(10,2),
  materials LONGTEXT,
  equipments LONGTEXT,
  labor LONGTEXT,
  invoices LONGTEXT,
  payments LONGTEXT,
  projectCode VARCHAR(50),
  expenses LONGTEXT,
  tasks LONGTEXT,
  clientId VARCHAR(50),
  images LONGTEXT
);

CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  unitCost DECIMAL(10,2),
  stockQuantity INT,
  category VARCHAR(50),
  lastUpdated VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(50) PRIMARY KEY,
  clientName VARCHAR(255),
  projectName VARCHAR(255),
  date VARCHAR(50),
  status VARCHAR(50),
  exchangeRate DECIMAL(10,2),
  materials LONGTEXT,
  equipments LONGTEXT,
  labor LONGTEXT,
  projectCode VARCHAR(50),
  expenses LONGTEXT,
  tasks LONGTEXT,
  clientId VARCHAR(50)
);
