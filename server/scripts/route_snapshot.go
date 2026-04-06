package main

import (
	"fmt"
	"sort"
	"xdfc-server/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	routes.SetupRoutes(r)

	rs := r.Routes()
	sort.Slice(rs, func(i, j int) bool {
		if rs[i].Method != rs[j].Method {
			return rs[i].Method < rs[j].Method
		}
		if rs[i].Path != rs[j].Path {
			return rs[i].Path < rs[j].Path
		}
		return rs[i].Handler < rs[j].Handler
	})

	for _, route := range rs {
		fmt.Printf("%-6s %s\t%s\n", route.Method, route.Path, route.Handler)
	}
}
