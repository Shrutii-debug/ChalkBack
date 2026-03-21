package config

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"chalkback/models"
)

var DB *gorm.DB //var DB *gorm.DB — a package-level variable.
// The * means it's a pointer to a gorm.DB object. We declare it here once and every handler file
//  imports this package and uses config.DB to run queries.
// One shared connection pool for the whole app. Creating a new connection per request would be extremely slow

func InitDB() {
	//dsn stands for Data Source Name — it's the connection string PostgreSQL needs.
	//  fmt.Sprintf works like string interpolation — each %s gets replaced by the corresponding os.Getenv() value
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Kolkata",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	err = DB.AutoMigrate(
		&models.Teacher{},
		&models.Feedback{},
		&models.Question{},
	)

	if err != nil {
		log.Fatalf("Automigrate failed: %v", err)
	}

	log.Println("Database connected and migrated successfully")
}
