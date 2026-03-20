package main

import (
    "fmt"
    "log"

    "github.com/joho/godotenv"
    "chalkback/config"
)

func main() {
	err := godotenv.Load()
	if err != nil{
		log.Fatal("error laoding .env file")
	}

	config.InitDB()
	fmt.Println("Everything works! DB connected.")
}