package handlers

import (
	"encoding/json"
	"errors"
	"html"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"unicode"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/text/encoding/simplifiedchinese"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const legacyKnowledgeBaseConfigKey = "BASIC_SETTINGS_KNOWLEDGE_BASE_ENTRIES"

var (
	knowledgeAllowedCategories = map[string]bool{
		"workflow":    true,
		"status":      true,
		"operation":   true,
		"exception":   true,
		"terminology": true,
	}
	knowledgeCategorySearchAliases = map[string][]string{
		"workflow":    {"流程", "工作流", "闭环", "workflow"},
		"status":      {"状态", "状态机", "status"},
		"operation":   {"操作", "作业", "使用", "operation"},
		"exception":   {"异常", "错误", "失败", "exception"},
		"terminology": {"术语", "名词", "概念", "terminology"},
	}
	knowledgePhrasePinyinAliases = map[string]string{
		"销售订单": "xiaoshoudingdan xsdd",
		"排产中":  "paichanzhong pcz",
		"一维码":  "yiweima ywm",
		"二维码":  "erweima ewm",
		"装箱组装": "zhuangxiangzuzhuang zxzz",
		"装箱码":  "zhuangxiangma zxm",
		"手机扫码": "shoujisaoma sjsm",
		"产品":   "chanpin cp",
		"作废":   "zuofei zf",
		"状态机":  "zhuangtaiji ztj",
		"闭环":   "bihuan bh",
		"知识库":  "zhishiku zsk",
		"流程":   "liucheng lc",
		"工作流":  "gongzuoliu gzl",
		"异常":   "yichang yc",
		"术语":   "shuyu sy",
	}
	knowledgeRunePinyinAliases = map[rune]string{
		'销': "xiao", '售': "shou", '订': "ding", '单': "dan", '为': "wei", '什': "shen", '么': "me",
		'进': "jin", '入': "ru", '排': "pai", '产': "chan", '中': "zhong", '一': "yi", '维': "wei",
		'码': "ma", '打': "da", '印': "yin", '装': "zhuang", '箱': "xiang", '组': "zu", '扫': "sao",
		'描': "miao", '手': "shou", '机': "ji", '内': "nei", '部': "bu", '作': "zuo", '废': "fei",
		'状': "zhuang", '态': "tai", '闭': "bi", '环': "huan", '知': "zhi", '识': "shi", '库': "ku",
		'流': "liu", '程': "cheng", '工': "gong", '异': "yi", '常': "chang", '术': "shu", '语': "yu",
	}
	knowledgeInitialRanges = []struct {
		start   int
		end     int
		initial byte
	}{
		{45217, 45252, 'a'}, {45253, 45760, 'b'}, {45761, 46317, 'c'},
		{46318, 46825, 'd'}, {46826, 47009, 'e'}, {47010, 47296, 'f'},
		{47297, 47613, 'g'}, {47614, 48118, 'h'}, {48119, 49061, 'j'},
		{49062, 49323, 'k'}, {49324, 49895, 'l'}, {49896, 50370, 'm'},
		{50371, 50613, 'n'}, {50614, 50621, 'o'}, {50622, 50905, 'p'},
		{50906, 51386, 'q'}, {51387, 51445, 'r'}, {51446, 52217, 's'},
		{52218, 52697, 't'}, {52698, 52979, 'w'}, {52980, 53640, 'x'},
		{53689, 54480, 'y'}, {54481, 55289, 'z'},
	}
	knowledgeTagPattern         = regexp.MustCompile(`<[^>]+>`)
	knowledgeBreakPattern       = regexp.MustCompile(`(?i)<br\s*/?>|</(p|div|li|h3|h4|blockquote)>`)
	knowledgeImagePattern       = regexp.MustCompile(`(?i)<img\b`)
	knowledgeVideoPattern       = regexp.MustCompile(`(?i)<(video|source)\b`)
	knowledgeScriptPattern      = regexp.MustCompile(`(?is)<script[\s\S]*?>[\s\S]*?</script>`)
	knowledgeInlineEventPattern = regexp.MustCompile(`(?i)\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)`)
	knowledgeJavascriptPattern  = regexp.MustCompile(`(?i)javascript:`)
	defaultKnowledgeBaseEntries = []knowledgeEntryInput{
		{
			ID:        "kb-sales-order-scheduling",
			Title:     "销售订单为什么要进入排产中",
			Category:  "status",
			Summary:   "排产中是销售订单进入一维码打印、MRP 和仓储备货前的闭环状态。",
			Content:   "销售订单从待处理进入排产中后，代表订单已经被确认并进入生产准备链路。一维码打印只选择排产中的订单，避免草稿、待处理或已作废订单被误打印。",
			Keywords:  []string{"销售订单", "排产中", "一维码打印", "作废订单", "状态机"},
			RoutePath: "/code-center/linear-barcode/print",
		},
		{
			ID:        "kb-packaging-assembly-scan",
			Title:     "装箱组装应该扫什么码",
			Category:  "operation",
			Summary:   "装箱组装先扫描纸箱上的装箱码，再录入箱内产品一维码。",
			Content:   "装箱码应先打印并贴到纸箱上。手机端扫描纸箱上的装箱码后，进入该箱的组装录入流程，再继续扫描箱内产品一维码完成绑定。",
			Keywords:  []string{"装箱组装", "装箱码", "手机扫码", "产品一维码", "仓储配置"},
			RoutePath: "/warehouse-config/packaging-assembly",
		},
		{
			ID:        "kb-canceled-order-meaning",
			Title:     "已作废订单为什么不参与业务选择",
			Category:  "workflow",
			Summary:   "已作废订单只保留历史追溯，不再进入打印、备货、发货等执行链路。",
			Content:   "已作废订单表示该业务单据已经退出执行链路。它可以在历史或审计场景中查看，但不应该出现在需要继续执行的选择器中。",
			Keywords:  []string{"已作废", "VOIDED", "Canceled", "闭环", "历史追溯"},
			RoutePath: "/trading/sales-orders",
		},
	}
)

type knowledgeEntryInput struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Category  string   `json:"category"`
	Summary   string   `json:"summary"`
	Content   string   `json:"content"`
	Keywords  []string `json:"keywords"`
	RoutePath string   `json:"routePath"`
	Version   int      `json:"version"`
}

type knowledgeScoredEntry struct {
	entry models.KnowledgeBaseEntry
	score int
}

func GetKnowledgeBaseEntriesHandler(c *gin.Context) {
	if err := ensureKnowledgeBaseSeeded(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to initialize entries: " + err.Error()})
		return
	}

	var entries []models.KnowledgeBaseEntry
	if err := db.DB.Order("updated_at desc").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to load entries"})
		return
	}

	c.JSON(http.StatusOK, entries)
}

func SearchKnowledgeBaseEntriesHandler(c *gin.Context) {
	if err := ensureKnowledgeBaseSeeded(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to initialize entries: " + err.Error()})
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	var entries []models.KnowledgeBaseEntry
	if err := db.DB.Order("updated_at desc").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to search entries"})
		return
	}
	if query == "" {
		c.JSON(http.StatusOK, entries)
		return
	}

	scoredEntries := make([]knowledgeScoredEntry, 0, len(entries))
	for _, entry := range entries {
		score := knowledgeEntrySearchScore(entry, query)
		if score <= 0 {
			continue
		}
		scoredEntries = append(scoredEntries, knowledgeScoredEntry{entry: entry, score: score})
	}
	sort.SliceStable(scoredEntries, func(i, j int) bool {
		if scoredEntries[i].score == scoredEntries[j].score {
			return scoredEntries[i].entry.UpdatedAt.After(scoredEntries[j].entry.UpdatedAt)
		}
		return scoredEntries[i].score > scoredEntries[j].score
	})

	results := make([]models.KnowledgeBaseEntry, 0, len(scoredEntries))
	for _, item := range scoredEntries {
		results = append(results, item.entry)
	}
	c.JSON(http.StatusOK, results)
}

func CreateKnowledgeBaseEntryHandler(c *gin.Context) {
	var input knowledgeEntryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid knowledge entry payload"})
		return
	}

	entry, err := buildKnowledgeBaseEntry(input, middleware.GetSafeUserID(c), "")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	entry.Version = 1

	if err := db.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to create entry: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, entry)
}

func UpdateKnowledgeBaseEntryHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var input knowledgeEntryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid knowledge entry payload"})
		return
	}

	var existing models.KnowledgeBaseEntry
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[KNOWLEDGE_BASE] entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to load entry"})
		return
	}
	if input.Version > 0 && existing.Version > 0 && input.Version != existing.Version {
		c.JSON(http.StatusConflict, gin.H{"error": "[KNOWLEDGE_BASE] entry version conflict"})
		return
	}

	next, err := buildKnowledgeBaseEntry(input, valueFromOptionalString(existing.CreatedBy), existing.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	next.UpdatedBy = optionalUserID(middleware.GetSafeUserID(c))
	next.Version = existing.Version + 1

	if err := db.DB.Model(&existing).Updates(map[string]interface{}{
		"title":        next.Title,
		"category":     next.Category,
		"summary":      next.Summary,
		"content_html": next.ContentHTML,
		"content_text": next.ContentText,
		"keywords":     next.Keywords,
		"route_path":   next.RoutePath,
		"has_image":    next.HasImage,
		"has_video":    next.HasVideo,
		"version":      next.Version,
		"updated_by":   next.UpdatedBy,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to update entry: " + err.Error()})
		return
	}

	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to reload entry"})
		return
	}
	c.JSON(http.StatusOK, existing)
}

func DeleteKnowledgeBaseEntryHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if err := db.DB.Delete(&models.KnowledgeBaseEntry{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to delete entry"})
		return
	}
	c.Status(http.StatusNoContent)
}

func RecordKnowledgeBaseEntryViewHandler(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if _, err := uuid.Parse(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid knowledge entry id"})
		return
	}

	var entry models.KnowledgeBaseEntry
	if err := db.DB.First(&entry, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[KNOWLEDGE_BASE] entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to load entry"})
		return
	}

	result := db.DB.Model(&entry).
		Updates(map[string]interface{}{
			"view_count":     gorm.Expr("view_count + 1"),
			"last_viewed_at": gorm.Expr("CURRENT_TIMESTAMP"),
		})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[KNOWLEDGE_BASE] failed to record entry view"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "[KNOWLEDGE_BASE] entry not found"})
		return
	}
	c.Status(http.StatusNoContent)
}

func buildKnowledgeBaseEntry(input knowledgeEntryInput, createdBy string, id string) (models.KnowledgeBaseEntry, error) {
	title := strings.TrimSpace(input.Title)
	category := strings.TrimSpace(input.Category)
	summary := strings.TrimSpace(input.Summary)
	content := sanitizeKnowledgeContentHTML(strings.TrimSpace(input.Content))
	routePath := strings.TrimSpace(input.RoutePath)
	if title == "" || summary == "" || content == "" {
		return models.KnowledgeBaseEntry{}, errors.New("[VALIDATION] title, summary and content are required")
	}
	if !knowledgeAllowedCategories[category] {
		return models.KnowledgeBaseEntry{}, errors.New("[VALIDATION] invalid knowledge category")
	}

	keywords, err := marshalKnowledgeKeywords(input.Keywords)
	if err != nil {
		return models.KnowledgeBaseEntry{}, err
	}
	if strings.TrimSpace(id) == "" {
		id = strings.TrimSpace(input.ID)
	}
	if strings.TrimSpace(id) == "" {
		id = uuid.NewString()
	} else if _, err := uuid.Parse(id); err != nil {
		id = deterministicKnowledgeBaseID(id)
	}

	userID := optionalUserID(createdBy)
	return models.KnowledgeBaseEntry{
		BaseModel:   models.BaseModel{ID: id},
		Title:       title,
		Category:    category,
		Summary:     summary,
		ContentHTML: content,
		ContentText: extractKnowledgeContentText(content),
		Keywords:    keywords,
		RoutePath:   routePath,
		HasImage:    knowledgeImagePattern.MatchString(content),
		HasVideo:    knowledgeVideoPattern.MatchString(content),
		Version:     1,
		CreatedBy:   userID,
		UpdatedBy:   userID,
	}, nil
}

func optionalUserID(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func valueFromOptionalString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func deterministicKnowledgeBaseID(value string) string {
	return uuid.NewSHA1(uuid.NameSpaceOID, []byte("xdfc-knowledge-base:"+strings.TrimSpace(value))).String()
}

func marshalKnowledgeKeywords(values []string) (json.RawMessage, error) {
	next := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, value := range values {
		keyword := strings.TrimSpace(value)
		if keyword == "" || seen[keyword] {
			continue
		}
		seen[keyword] = true
		next = append(next, keyword)
	}
	if next == nil {
		next = []string{}
	}
	raw, err := json.Marshal(next)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(raw), nil
}

func extractKnowledgeContentText(content string) string {
	withBreaks := knowledgeBreakPattern.ReplaceAllString(content, "\n")
	withoutTags := knowledgeTagPattern.ReplaceAllString(withBreaks, "")
	return strings.TrimSpace(html.UnescapeString(withoutTags))
}

func knowledgeEntrySearchScore(entry models.KnowledgeBaseEntry, query string) int {
	tokens := knowledgeSearchTokens(query)
	if len(tokens) == 0 {
		return 1
	}

	document := knowledgeEntrySearchDocument(entry)
	score := 0
	for _, token := range tokens {
		if strings.Contains(strings.ToLower(entry.Title), token) {
			score += 12
			continue
		}
		if keywordMatchesKnowledgeToken(entry.Keywords, token) {
			score += 10
			continue
		}
		if strings.Contains(strings.ToLower(entry.Summary), token) {
			score += 8
			continue
		}
		if strings.Contains(strings.ToLower(entry.RoutePath), token) {
			score += 6
			continue
		}
		if strings.Contains(document, token) {
			score += 3
			continue
		}
		return 0
	}
	return score + knowledgeViewHeatScore(entry.ViewCount)
}

func knowledgeEntrySearchDocument(entry models.KnowledgeBaseEntry) string {
	parts := []string{
		entry.Title,
		entry.Summary,
		entry.ContentText,
		extractKnowledgeContentText(entry.ContentHTML),
		entry.RoutePath,
		entry.Category,
	}
	if aliases, ok := knowledgeCategorySearchAliases[entry.Category]; ok {
		parts = append(parts, aliases...)
	}
	var keywords []string
	if err := json.Unmarshal(entry.Keywords, &keywords); err == nil {
		parts = append(parts, keywords...)
	}
	parts = append(parts, knowledgePinyinAliases(strings.Join(parts, " ")))
	return strings.ToLower(strings.Join(parts, " "))
}

func knowledgePinyinAliases(value string) string {
	parts := make([]string, 0, 4)
	for phrase, alias := range knowledgePhrasePinyinAliases {
		if strings.Contains(value, phrase) {
			parts = append(parts, alias)
		}
	}

	fullPinyin := strings.Builder{}
	initials := strings.Builder{}
	for _, r := range value {
		if unicode.IsSpace(r) {
			continue
		}
		if alias, ok := knowledgeRunePinyinAliases[r]; ok {
			fullPinyin.WriteString(alias)
			initials.WriteByte(alias[0])
			continue
		}
		if initial, ok := knowledgePinyinInitial(r); ok {
			initials.WriteByte(initial)
		}
	}
	if fullPinyin.Len() > 0 {
		parts = append(parts, fullPinyin.String())
	}
	if initials.Len() > 0 {
		parts = append(parts, initials.String())
	}
	return strings.Join(parts, " ")
}

func knowledgePinyinInitial(r rune) (byte, bool) {
	if r <= unicode.MaxASCII {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return byte(unicode.ToLower(r)), true
		}
		return 0, false
	}
	encoded, err := simplifiedchinese.GBK.NewEncoder().String(string(r))
	if err != nil || len(encoded) < 2 {
		return 0, false
	}
	code := int(encoded[0])<<8 + int(encoded[1])
	for _, item := range knowledgeInitialRanges {
		if code >= item.start && code <= item.end {
			return item.initial, true
		}
	}
	return 0, false
}

func knowledgeViewHeatScore(viewCount int) int {
	switch {
	case viewCount >= 100:
		return 8
	case viewCount >= 50:
		return 6
	case viewCount >= 20:
		return 4
	case viewCount >= 5:
		return 2
	case viewCount > 0:
		return 1
	default:
		return 0
	}
}

func keywordMatchesKnowledgeToken(raw json.RawMessage, token string) bool {
	var keywords []string
	if err := json.Unmarshal(raw, &keywords); err != nil {
		return false
	}
	for _, keyword := range keywords {
		if strings.Contains(strings.ToLower(keyword), token) {
			return true
		}
	}
	return false
}

func knowledgeSearchTokens(query string) []string {
	normalized := strings.ToLower(strings.TrimSpace(query))
	fields := strings.FieldsFunc(normalized, func(r rune) bool {
		return r == ' ' || r == ',' || r == '，' || r == ';' || r == '；' || r == '、' || r == '\n' || r == '\t'
	})
	tokens := make([]string, 0, len(fields))
	seen := map[string]bool{}
	for _, field := range fields {
		token := strings.TrimSpace(field)
		if token == "" || seen[token] {
			continue
		}
		seen[token] = true
		tokens = append(tokens, token)
	}
	return tokens
}

func sanitizeKnowledgeContentHTML(content string) string {
	withoutScripts := knowledgeScriptPattern.ReplaceAllString(content, "")
	withoutEvents := knowledgeInlineEventPattern.ReplaceAllString(withoutScripts, "")
	return strings.TrimSpace(knowledgeJavascriptPattern.ReplaceAllString(withoutEvents, ""))
}

func ensureKnowledgeBaseSeeded() error {
	var count int64
	if err := db.DB.Model(&models.KnowledgeBaseEntry{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	legacyEntries, legacyErr := loadLegacyKnowledgeBaseEntries()
	seedEntries := legacyEntries
	if legacyErr != nil || len(seedEntries) == 0 {
		seedEntries = defaultKnowledgeBaseEntries
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		var txCount int64
		if err := tx.Model(&models.KnowledgeBaseEntry{}).Count(&txCount).Error; err != nil {
			return err
		}
		if txCount > 0 {
			return nil
		}
		for _, input := range seedEntries {
			entry, err := buildKnowledgeBaseEntry(input, "", input.ID)
			if err != nil {
				return err
			}
			if entry.Version <= 0 {
				entry.Version = 1
			}
			if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&entry).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func loadLegacyKnowledgeBaseEntries() ([]knowledgeEntryInput, error) {
	var config models.SystemConfig
	if err := db.DB.First(&config, "key = ?", legacyKnowledgeBaseConfigKey).Error; err != nil {
		return nil, err
	}
	var entries []knowledgeEntryInput
	if err := json.Unmarshal([]byte(config.Value), &entries); err != nil {
		return nil, err
	}
	return entries, nil
}
