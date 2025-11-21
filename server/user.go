package main

import (
	"encoding/json"
	"net/http"
	"time"
)

func handleHistory(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста (middleware)
	userID := r.Context().Value("userID").(int)

	// 1. Обработка DELETE запроса (Очистка истории)
	if r.Method == "DELETE" {
		_, err := db.Exec("DELETE FROM speeches WHERE user_id = ?", userID)
		if err != nil {
			httpError(w, "Failed to delete history", 500)
			return
		}
		jsonResponse(w, map[string]string{"msg": "History cleared"})
		return
	}

	// 2. Обработка GET запроса (Получение списка)
	// ВАЖНО: Добавлено поле 'metrics' в SQL запрос
	rows, err := db.Query(`
		SELECT id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip, metrics, created_at 
		FROM speeches 
		WHERE user_id = ? 
		ORDER BY created_at DESC`, userID)
	
	if err != nil {
		httpError(w, "DB Query Error", 500)
		return
	}
	defer rows.Close()

	res := []map[string]interface{}{}

	for rows.Next() {
		var id, cl, pm int
		var tr, fw, fb, tp, metStr string // metStr для сырого JSON метрик
		var dt time.Time

		// Сканируем данные из БД
		// Если у старых записей нет колонки metrics (и она NULL), SQL драйвер может ругнуться, 
		// но так как мы сделали DEFAULT '{}', всё должно быть ок.
		if err := rows.Scan(&id, &tr, &cl, &pm, &fw, &fb, &tp, &metStr, &dt); err != nil {
			continue // Пропускаем битую строку, если что
		}

		// Распаковка fillerWords
		var fwArr []string
		if fw == "" { fw = "[]" }
		_ = json.Unmarshal([]byte(fw), &fwArr)

		// --- РАСПАКОВКА МЕТРИК (ДЛЯ ДИАГРАММЫ) ---
		var metricsObj map[string]interface{}
		// Если запись старая и метрик нет, подсовываем дефолт
		if metStr == "" { metStr = "{}" } 
		_ = json.Unmarshal([]byte(metStr), &metricsObj)

		// Формируем красивый JSON для фронтенда
		res = append(res, map[string]interface{}{
			"id":           id,
			"transcript":   tr,
			"clarityScore": cl,
			"pace":         pm,
			"fillerWords":  fwArr,
			"feedback":     fb,
			"tip":          tp,
			"metrics":      metricsObj, // <-- Отдаем данные для Radar Chart
			"date":         dt,
		})
	}

	// Возвращаем пустой массив вместо null, если записей нет
	if res == nil {
		res = []map[string]interface{}{}
	}

	jsonResponse(w, res)
}

func handleGetProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)

	var u UserProfile
	var badgesStr string

	err := db.QueryRow(`SELECT username, xp, level, streak, badges FROM users WHERE id=?`, userID).
		Scan(&u.Username, &u.XP, &u.Level, &u.Streak, &badgesStr)

	if err != nil {
		httpError(w, "User stats not found", 404)
		return
	}

	if badgesStr == "" { badgesStr = "[]" }
	json.Unmarshal([]byte(badgesStr), &u.Badges)

	u.NextLvlXP = u.Level * 1000
	u.Title = getTitleByLevel(u.Level) // Функция из gamification.go

	jsonResponse(w, u)
}
