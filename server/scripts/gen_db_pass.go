//go:build ignore

package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	pass := "Wang622575"
	// 使用和 db.go 一致的 cost = 4，确保万无一失
	hash, err := bcrypt.GenerateFromPassword([]byte(pass), 4)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(string(hash))
}
