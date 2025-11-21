package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"sync"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
	_ "modernc.org/sqlite" 
)

var (
	jwtSecret []byte
	db        *sql.DB
	bot       *tgbotapi.BotAPI
	gemini    *genai.GenerativeModel
	otpStore  = make(map[string]*OtpSession)
	otpMutex  sync.Mutex
)

func initDB() {
	var err error
	// Открываем подключение
	db, err = sql.Open("sqlite", "./orato.db")
	if err != nil {
		log.Fatal("[!] DB Connection Error:", err)
	}

	query := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT,
		email TEXT UNIQUE,
		password TEXT,
		telegram_chat_id TEXT,
		-- Геймификация --
		xp INTEGER DEFAULT 0,
		level INTEGER DEFAULT 1,
		streak INTEGER DEFAULT 0,
		last_active DATE,         -- Дата последней тренировки
		badges TEXT DEFAULT '[]'  -- Храним JSON массив: ["streak_5", "expert"]
	);
	CREATE TABLE IF NOT EXISTS speeches (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		transcript TEXT,
		clarity_score INTEGER,
		pace_wpm INTEGER,
		filler_words TEXT,
		feedback TEXT,
		tip TEXT,
		metrics TEXT DEFAULT '{}',  -- <-- НОВАЯ КОЛОНКА ДЛЯ ДИАГРАММЫ
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);`

	_, err = db.Exec(query)
	if err != nil {
		log.Fatal("[!] DB Init Error:", err)
	}
	fmt.Println("[+] Database initialized successfully (Orato v2)")
}

func initTelegram() {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	if token == "" {
		log.Println("[!] WARNING: TELEGRAM_BOT_TOKEN is missing")
		return
	}
	var err error
	bot, err = tgbotapi.NewBotAPI(token)
	if err != nil {
		log.Println("[!] Telegram Auth Failed:", err)
	} else {
		fmt.Printf("[+] Telegram Bot started: %s\n", bot.Self.UserName)
		go func() {
			u := tgbotapi.NewUpdate(0)
			u.Timeout = 60
			updates := bot.GetUpdatesChan(u)
			for update := range updates {
				if update.Message != nil && update.Message.Text == "/start" {
					chatId := update.Message.Chat.ID
					firstName := update.Message.From.FirstName
					text := fmt.Sprintf("👋 Привет, %s!\n\nТвой Telegram Chat ID: %d\n\nСкопируй эти цифры и вставь их при регистрации на сайте Orato AI.", firstName, chatId)
					msg := tgbotapi.NewMessage(chatId, text)
					bot.Send(msg)
					fmt.Printf("[*] User interaction: %d\n", chatId)
				}
			}
		}()
	}
}

func initGemini() {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("[!] GEMINI_API_KEY is missing")
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		log.Fatal("[!] Gemini Client Error:", err)
	}

	modelName := "gemini-2.0-flash"
	fmt.Printf("[+] Connected to model: %s\n", modelName)
	gemini = client.GenerativeModel(modelName)

	gemini.SafetySettings = []*genai.SafetySetting{
		{Category: genai.HarmCategoryHarassment, Threshold: genai.HarmBlockNone},
		{Category: genai.HarmCategoryHateSpeech, Threshold: genai.HarmBlockNone},
		{Category: genai.HarmCategorySexuallyExplicit, Threshold: genai.HarmBlockNone},
		{Category: genai.HarmCategoryDangerousContent, Threshold: genai.HarmBlockNone},
	}
	gemini.SetTemperature(0.7)
}
