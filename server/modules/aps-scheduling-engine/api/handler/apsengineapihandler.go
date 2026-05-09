package apsschedulingengine

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	apsengine "xdfc-server/modules/aps-scheduling-engine"
	apsdto "xdfc-server/modules/aps-scheduling-engine/api/dto"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type APIHandler struct {
	Engine *apsengine.Engine
}

func NewAPIHandler(engine *apsengine.Engine) *APIHandler {
	return &APIHandler{Engine: engine}
}

func (h *APIHandler) Register(rg *gin.RouterGroup) {
	rg.POST("/aps-scheduling/plans", h.CreatePlan)
	rg.GET("/aps-scheduling/plans", h.ListPlans)
	rg.GET("/aps-scheduling/plans/:id", h.GetPlan)
	rg.POST("/aps-scheduling/plans/:id/recalculate", h.RecalculatePlan)
	rg.POST("/aps-scheduling/events", h.IngestEvent)
}

func (h *APIHandler) ensureEngine() *apsengine.Engine {
	if h.Engine == nil {
		h.Engine = apsengine.NewEngine()
	}
	return h.Engine
}

func buildCalendarInput(ctx context.Context, startDateRaw string, endDateRaw string) ([]apsengine.CalendarDay, error) {
	query, err := services.ParseApsEngineDateRuleQuery(startDateRaw, endDateRaw)
	if err != nil {
		return nil, err
	}

	snapshot := services.GetApsEngineDateRuleSnapshot(ctx, query)
	return services.BuildApsEngineCalendarDays(snapshot.CalendarDays), nil
}

func (h *APIHandler) CreatePlan(c *gin.Context) {
	var req apsdto.CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	engine := h.ensureEngine()
	orders := make([]apsengine.Order, 0, len(req.OrderIDs))
	for _, orderID := range req.OrderIDs {
		if strings.TrimSpace(orderID) == "" {
			continue
		}
		orders = append(orders, apsengine.Order{ID: orderID, OrderNo: orderID, Priority: 1, Status: "pending"})
	}

	calendar, err := buildCalendarInput(c.Request.Context(), req.StartDate, req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := apsengine.BuildPlanInput{
		Orders:    orders,
		Resources: []apsengine.Resource{{ID: "resource-default", Available: true}},
		Calendar:  calendar,
		Events:    []apsengine.ScheduleEvent{},
	}

	plan, err := engine.BuildPlan(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, apsdto.PlanResponse{ID: plan.ID, Version: plan.Version, Status: plan.Status})
}

func (h *APIHandler) ListPlans(c *gin.Context) {
	page, err := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("page", "1")))
	if err != nil || page < 1 {
		page = 1
	}
	pageSize, err := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("pageSize", "50")))
	if err != nil || pageSize < 1 {
		pageSize = 50
	}

	c.JSON(http.StatusOK, apsdto.PlanListResponse{
		Items:    []apsdto.PlanListItemResponse{},
		Total:    0,
		Page:     page,
		PageSize: pageSize,
	})
}

func (h *APIHandler) GetPlan(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"id": c.Param("id"), "version": 1, "status": "draft"})
}

func (h *APIHandler) RecalculatePlan(c *gin.Context) {
	var req apsdto.RecalculatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	engine := h.ensureEngine()
	current := &apsengine.SchedulePlan{ID: c.Param("id"), Version: 1, Status: "draft"}
	calendar, err := buildCalendarInput(c.Request.Context(), req.StartDate, req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plan, err := engine.Planner.Recalculate(
		c.Request.Context(),
		apsengine.ScheduleEvent{Type: req.Scope, Payload: map[string]any{"reason": req.Reason}},
		apsengine.BuildPlanInput{
			Resources: []apsengine.Resource{{ID: "resource-default", Available: true}},
			Orders:    []apsengine.Order{{ID: c.Param("id"), OrderNo: c.Param("id"), Priority: 1, Status: "pending"}},
			Calendar:  calendar,
		},
		current,
		engine.Rules,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, apsdto.PlanResponse{ID: plan.ID, Version: plan.Version, Status: plan.Status})
}

func (h *APIHandler) IngestEvent(c *gin.Context) {
	var req apsdto.IngestEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	engine := h.ensureEngine()
	current := &apsengine.SchedulePlan{ID: "event-plan", Version: 1, Status: "draft"}
	calendar, err := buildCalendarInput(c.Request.Context(), req.StartDate, req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := apsengine.BuildPlanInput{
		Orders:    []apsengine.Order{{ID: "event-order", OrderNo: "event-order", Priority: 1, Status: "pending"}},
		Resources: []apsengine.Resource{{ID: "resource-default", Available: true}},
		Calendar:  calendar,
		Events:    []apsengine.ScheduleEvent{{Type: req.Type, Payload: req.Payload}},
	}
	plan, err := engine.Planner.Recalculate(c.Request.Context(), apsengine.ScheduleEvent{Type: req.Type, Payload: req.Payload}, input, current, engine.Rules)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"accepted": true, "plan": apsdto.PlanResponse{ID: plan.ID, Version: plan.Version, Status: plan.Status}})
}
