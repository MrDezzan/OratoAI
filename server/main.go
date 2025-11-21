package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("[!] .env file not found (using system env)")
	}

	initDB()
	initTelegram()
	initGemini()

	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	if len(jwtSecret) == 0 {
		jwtSecret = []byte("secret")
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/api/auth/register-init", handleRegisterInit)
	mux.HandleFunc("/api/auth/login-init", handleLoginInit)
	mux.HandleFunc("/api/auth/verify", handleVerify)
	mux.HandleFunc("/api/analyze", authMiddleware(handleAnalyze))
	mux.HandleFunc("/api/companion/chat", authMiddleware(handleCompanion))
	mux.HandleFunc("/api/history", authMiddleware(handleHistory))
	mux.HandleFunc("/api/profile", authMiddleware(handleGetProfile))

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	fmt.Printf("[*] Server running on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, c.Handler(mux)))
}
