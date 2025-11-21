package main

import "time"

type UserProfile struct {
	Username  string   `json:"username"`
	XP        int      `json:"xp"`
	Level     int      `json:"level"`
	Streak    int      `json:"streak"`
	Badges    []string `json:"badges"`
	NextLvlXP int      `json:"nextLvlXp"` 
	Title     string   `json:"title"`     
}

type OtpSession struct {
	Code      string
	Attempts  int
	Type      string
	TempUser  *RegisterData
	UserID    int
	Username  string
	ExpiresAt time.Time
}

type RegisterData struct {
	Username   string `json:"username"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	TelegramID string `json:"telegramId"`
}

// Структуры для парсинга JSON внутри хендлеров можно оставить тут или внутри функций,
// но для чистоты часто выносят сюда:
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type VerifyRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type AnalyzeRequest struct {
	Transcript string  `json:"transcript"`
	Duration   float64 `json:"durationSeconds"`
}

type CompanionRequest struct {
	Message string `json:"message"`
	Mode    string `json:"mode"`
}