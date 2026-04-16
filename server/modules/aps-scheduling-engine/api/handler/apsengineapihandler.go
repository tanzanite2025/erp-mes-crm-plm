package apsschedulingengine

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type APIHandler struct {
	Engine *Engine
}

func NewAPIHandler(engine *Engine) *APIHandler {
	return &APIHandler{Engine: engine}
}

func (h *APIHandler) Register(rg *gin.RouterGroup) {
	rg.POST("/aps-scheduling/plans", h.CreatePlan)
	rg.GET("/aps-scheduling/plans", h.ListPlans)
	rg.GET("/aps-scheduling/plans/:id", h.GetPlan)
	rg.POST("/aps-scheduling/plans/:id/recalculate", h.RecalculatePlan)
	rg.POST("/aps-scheduling/events", h.IngestEvent)
}

func (h *APIHandler) ensureEngine() *Engine {
	if h.Engine == nil {
		h.Engine = NewEngine()
	}
	return h.Engine
}

func (h *APIHandler) CreatePlan(c *gin.Context) {
	var req CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	engine := h.ensureEngine()
	orders := make([]Order, 0, len(req.OrderIDs))
	for _, orderID := range req.OrderIDs {
		if strings.TrimSpace(orderID) == "" {
			continue
		}
		orders = append(orders, Order{ID: orderID, OrderNo: orderID, Priority: 1, Status: "pending"})
	}

	input := BuildPlanInput{
		Orders:    orders,
		Resources: []Resource{{ID: "resource-default", Available: true}},
		Calendar:  []CalendarDay{},
		Events:    []ScheduleEvent{},
	}

	plan, err := engine.BuildPlan(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, PlanResponse{ID: plan.ID, Version: plan.Version, Status: plan.Status})
}

func (h *APIHandler) ListPlans(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"items": []PlanResponse{}})
}

func (h *APIHandler) GetPlan(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"id": c.Param("id"), "version": 1, "status": "draft"})
}

func (h *APIHandler) RecalculatePlan(c *gin.Context) {
	var req RecalculatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	engine := h.ensureEngine()
	current := &SchedulePlan{ID: c.Param("id"), Version: 1, Status: "draft"}
	plan, err := engine.Planner.Recalculate(
		c.Request.Context(),
		ScheduleEvent{Type: req.Scope, Payload: map[string]any{"reason": req.Reason}},
		BuildPlanInput{
			Resources: []Resource{{ID: "resource-default", Available: true}},
			Orders:    []Order{{ID: c.Param("id"), OrderNo: c.Param("id"), Priority: 1, Status: "pending"}},
		},
		current,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, PlanResponse{ID: plan.ID, Version: plan.Version, Status: plan.Status})
}

func (h *APIHandler) IngestEvent(c *gin.Context) {
	var req IngestEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	engine := h.ensureEngine()
	current := &SchedulePlan{ID: "event-plan", Version: 1, Status: "draft"}
	input := BuildPlanInput{
		Orders:    []Order{{ID: "event-order", OrderNo: "event-order", Priority: 1, Status: "pending"}},
		Resources: []Resource{{ID: "resource-default", Available: true}},
		Calendar:  []CalendarDay{},
		Events:    []ScheduleEvent{{Type: req.Type, Payload: req.Payload}},
	}
	plan, err := engine.Planner.Recalculate(c.Request.Context(), ScheduleEvent{Type: req.Type, Payload: req.Payload}, input, current)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"accepted": true, "plan": PlanResponse{ID: plan.ID, Version: plan.Version, Status: plan.Status}})
}
