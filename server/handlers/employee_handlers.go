package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type bulkUpdateEmployeeStatusRequest struct {
	IDs    []string `json:"ids"`
	Status string   `json:"status"`
}

type commitEmployeeImportRequest struct {
	PreviewToken string `json:"previewToken"`
	Mode         string `json:"mode"`
}

func GetEmployeesHandler(c *gin.Context) {
	employees, err := services.ListEmployees()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employees"})
		return
	}
	c.JSON(http.StatusOK, mapEmployeeResponses(employees))
}

func BulkUpdateEmployeeStatusHandler(c *gin.Context) {
	var input bulkUpdateEmployeeStatusRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee status payload: " + err.Error()})
		return
	}
	if len(input.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids cannot be empty"})
		return
	}

	updated, err := services.BulkUpdateEmployeeStatus(input.IDs, input.Status)
	if err != nil {
		if err == services.ErrInvalidEmployeeStatus || err == services.ErrEmptyEmployeeIDs {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to bulk update employee status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "updated": updated})
}

func SaveEmployeeHandler(c *gin.Context) {
	var input models.Employee
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee payload: " + err.Error()})
		return
	}

	employee, err := services.SaveEmployee(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save employee"})
		return
	}

	var refreshed models.Employee
	if err := db.DB.Table("employees").
		Select("employees.*, organizations.name as dept_name, production_lines.name as line_name, process_steps.name as process_name").
		Joins("LEFT JOIN organizations ON employees.dept_id = CAST(organizations.id AS TEXT)").
		Joins("LEFT JOIN production_lines ON employees.line_id = CAST(production_lines.id AS TEXT)").
		Joins("LEFT JOIN process_steps ON employees.process_id = CAST(process_steps.id AS TEXT)").
		Where("employees.id = ?", employee.ID).
		First(&refreshed).Error; err == nil {
		c.JSON(http.StatusOK, mapEmployeeResponse(refreshed))
		return
	}

	c.JSON(http.StatusOK, mapEmployeeResponse(employee))
}

func PatchEmployeeHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.PatchDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee patch payload: " + err.Error()})
		return
	}
	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "staffId", "name", "gender", "birthday", "idCard", "phone", "emergencyPhone", "address", "bankCard", "bankName", "education", "age", "station", "status", "joinedDate", "deptId", "lineId", "processId"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee delta: " + err.Error()})
		return
	}

	patch := services.PatchEmployeeRequest{
		ID:              id,
		ExpectedVersion: req.Metadata.Version,
		DeltaKeys:       servicesDeltaKeys(req.Delta),
	}
	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee delta payload: " + err.Error()})
			return
		}

		switch key {
		case "staffId":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee staffId payload"})
				return
			}
			patch.StaffID = &value
		case "name":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee name payload"})
				return
			}
			patch.Name = &value
		case "gender":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee gender payload"})
				return
			}
			patch.Gender = &value
		case "birthday":
			value, err := parseOptionalTimeValue(valueRaw)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee birthday payload"})
				return
			}
			patch.Birthday = value
			patch.BirthdaySet = true
		case "idCard":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee idCard payload"})
				return
			}
			patch.IDCard = &value
		case "phone":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee phone payload"})
				return
			}
			patch.Phone = &value
		case "emergencyPhone":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee emergencyPhone payload"})
				return
			}
			patch.EmergencyPhone = &value
		case "address":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee address payload"})
				return
			}
			patch.Address = &value
		case "bankCard":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee bankCard payload"})
				return
			}
			patch.BankCard = &value
		case "bankName":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee bankName payload"})
				return
			}
			patch.BankName = &value
		case "education":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee education payload"})
				return
			}
			patch.Education = &value
		case "age":
			var value int
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee age payload"})
				return
			}
			patch.Age = &value
		case "station":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee station payload"})
				return
			}
			patch.Station = &value
		case "status":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee status payload"})
				return
			}
			patch.Status = &value
		case "joinedDate":
			value, err := parseOptionalTimeValue(valueRaw)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee joinedDate payload"})
				return
			}
			patch.JoinedDate = value
			patch.JoinedDateSet = true
		case "deptId":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee deptId payload"})
				return
			}
			patch.DeptID = &value
		case "lineId":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee lineId payload"})
				return
			}
			patch.LineID = &value
		case "processId":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee processId payload"})
				return
			}
			patch.ProcessID = &value
		}
	}

	refreshed, err := services.PatchEmployee(patch)
	if err != nil {
		if errors.Is(err, services.ErrEmployeePatchVersionConflict) {
			respondVersionConflict(c)
			return
		}
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to patch employee: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapEmployeeResponse(refreshed))
}

func PreviewEmployeeImportHandler(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	reader, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to open uploaded file"})
		return
	}
	defer func() { _ = reader.Close() }()

	preview, err := services.PreviewEmployeeImport(file.Filename, reader)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, services.ErrEmployeeImportPreviewNotFound) {
			status = http.StatusGone
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, preview)
}

func CommitEmployeeImportHandler(c *gin.Context) {
	var input commitEmployeeImportRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid employee import commit payload: " + err.Error()})
		return
	}

	result, err := services.CommitEmployeeImport(services.CommitEmployeeImportRequest{
		PreviewToken: input.PreviewToken,
		Mode:         services.EmployeeImportMode(input.Mode),
	})
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, services.ErrEmployeeImportPreviewNotFound) {
			status = http.StatusGone
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func DeleteEmployeeHandler(c *gin.Context) {
	ids := strings.Split(c.Param("id"), ",")

	err := services.DeleteEmployees(ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete employees and disable linked users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Employees deleted and linked users disabled"})
}
