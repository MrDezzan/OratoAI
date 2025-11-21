package main

import (
	"encoding/json"
	"net/http"
	"time"
)

func handleHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)

	if r.Method == "DELETE" {
		_, err := db.Exec("DELETE FROM speeches WHERE user_id = ?", userID)
		if err != nil {
			httpError(w, "DB Error", 500)
			return
		}
		jsonResponse(w, map[string]string{"msg": "Deleted"})
		return
	}

	rows, err := db.Query("SELECT id, transcript, clarity_score, pace_wpm, filler_words, feedback, tip, created_at FROM speeches WHERE user_id = ? ORDER BY created_at DESC", userID)
	if err != nil {
		httpError(w, "DB Error", 500)
		return
	}
	defer rows.Close()

	res := []map[string]interface{}{}
	for rows.Next() {
		var id, cl, pm int
		var tr, fw, fb, tp string
		var dt time.Time
		rows.Scan(&id, &tr, &cl, &pm, &fw, &fb, &tp, &dt)
		var fwArr []string
		if err := json.Unmarshal([]byte(fw), &fwArr); err != nil {
			fwArr = []string{}
		}
		
		res = append(res, map[string]interface{}{
			"id":           id,
			"transcript":   tr,
			"clarityScore": cl,
			"pace":         pm,
			"fillerWords":  fwArr,
			"feedback":     fb,
			"tip":          tp,
			"date":         dt,
		})
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
