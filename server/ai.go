package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log" // <-- ДОБАВИЛ ИМПОРТ
	"math"
	"net/http"
	"strings"

	"github.com/google/generative-ai-go/genai"
)

// --- ОБНОВЛЕННАЯ ФУНКЦИЯ АНАЛИЗА ---
func handleAnalyze(w http.ResponseWriter, r *http.Request) {
	var req AnalyzeRequest 
	json.NewDecoder(r.Body).Decode(&req)
	
	// Проверка на наличие ID в контексте
	uidVal := r.Context().Value("userID")
	if uidVal == nil {
		httpError(w, "Unauthorized", 401)
		return
	}
	uid := uidVal.(int)

	if len(strings.TrimSpace(req.Transcript)) < 2 {
		httpError(w, "Нет текста", 400)
		return
	}

	// Промпт с метриками
	prompt := fmt.Sprintf(`
	Роль: Судья по ораторскому мастерству. Язык: Русский.
	Текст выступления: "%s"
	
	Задача: Оцени речь и верни СТРОГИЙ JSON (без Markdown).
	
	Структура JSON:
	{
		"clarityScore": (0-100, общая оценка),
		"metrics": {
			"confidence": (0-100, уверенность),
			"vocabulary": (0-100, богатство языка),
			"structure": (0-100, логика),
			"empathy": (0-100, эмоциональность),
			"conciseness": (0-100, краткость)
		},
		"fillerWords": ["слово1", "слово2"],
		"feedback": "Похвала (1-2 предл., русский)",
		"tip": "Совет (1-2 предл., русский)"
	}`, req.Transcript)

	ctx := context.Background()
	gemini.SetTemperature(0.5)
	resp, err := gemini.GenerateContent(ctx, genai.Text(prompt))
	
	if err != nil {
		log.Println("[!] Gemini Error:", err)
		httpError(w, "Ошибка ИИ", 500)
		return
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		part := resp.Candidates[0].Content.Parts[0]
		txt := fmt.Sprintf("%s", part)

		// Очистка JSON (без regexp)
		s, e := strings.Index(txt, "{"), strings.LastIndex(txt, "}")
		if s != -1 && e != -1 {
			cleanJson := txt[s : e+1]
			
			var result map[string]interface{}
			if json.Unmarshal([]byte(cleanJson), &result) == nil {
				
				// 1. Расчет темпа (WPM)
				if req.Duration <= 0 { req.Duration = 1 }
				wpm := int(math.Round(float64(len(strings.Fields(req.Transcript))) / req.Duration * 60))

				// 2. Извлечение полей
				clarity := 0
				if v, ok := result["clarityScore"].(float64); ok { clarity = int(v) }
				
				fwBytes, _ := json.Marshal(result["fillerWords"])
				metricsBytes, _ := json.Marshal(result["metrics"]) 
				
				fb, _ := result["feedback"].(string)
				tp, _ := result["tip"].(string)

				// 3. Сохранение в БД
				_, err := db.Exec(`INSERT INTO speeches (user_id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip, metrics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					uid, req.Transcript, clarity, wpm, string(fwBytes), fb, tp, string(metricsBytes))
				
				if err != nil {
					log.Println("[!] DB Save Error:", err)
				}

				// 4. ГЕЙМИФИКАЦИЯ
				// Мы используем имя processGamification, которое определим в отдельном файле
				go processGamification(uid, clarity, wpm) 

				result["pace"] = wpm
				jsonResponse(w, result)
				return
			}
		}
	}
	httpError(w, "Format Error", 500)
}

func handleCompanion(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
		Mode    string `json:"mode"`
	}
	
	if json.NewDecoder(r.Body).Decode(&req) != nil {
		httpError(w, "Invalid JSON", 400)
		return
	}

	ctx := context.Background()
	var rolePrompt string
	var temp float32

	switch req.Mode {
	case "interview":
		rolePrompt = `Роль: Строгий HR-менеджер. Тон: Холодный. Задача: Проводи собеседование.`
		temp = 0.3 
	case "debate":
		rolePrompt = `Роль: Оппонент в дебатах. Тон: Напористый. Задача: Спорь и опровергай.`
		temp = 0.9
	default: 
		rolePrompt = `Роль: Дружелюбный наставник. Тон: Теплый. Задача: Поддерживай беседу.`
		temp = 0.7
	}

	prompt := fmt.Sprintf(`%s Язык: Русский. Ответь кратко (1-3 предл). Пользователь: "%s"`, rolePrompt, req.Message)

	gemini.SetTemperature(temp)
	resp, err := gemini.GenerateContent(ctx, genai.Text(prompt))
	
	if err == nil && len(resp.Candidates) > 0 {
		if part, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			txt := string(part)
			txt = strings.ReplaceAll(txt, "*", "")
			jsonResponse(w, map[string]string{"reply": txt})
			return
		}
	}
	httpError(w, "AI Error", 500)
}