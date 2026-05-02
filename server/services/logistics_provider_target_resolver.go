package services

import "strings"

type LogisticsProviderTargetPurpose string

const (
	LogisticsProviderTargetPurposeVerify      LogisticsProviderTargetPurpose = "verify"
	LogisticsProviderTargetPurposeTracking    LogisticsProviderTargetPurpose = "tracking"
	LogisticsProviderTargetPurposeOrderCreate LogisticsProviderTargetPurpose = "order_create"
	LogisticsProviderTargetPurposeLabel       LogisticsProviderTargetPurpose = "label"
)

type LogisticsProviderTargetResolution struct {
	ProviderCode   string
	Purpose        LogisticsProviderTargetPurpose
	TargetURL      string
	Supported      bool
	ManualReview   bool
	SummaryMessage string
	ActionMessage  string
}

type logisticsProviderTargetProfile struct {
	VerificationURL string
	TrackingURL     string
	OrderCreateURL  string
	LabelURL        string
}

var trustedLogisticsProviderTargets = map[string]logisticsProviderTargetProfile{
	"SF": {
		VerificationURL: "https://bspgw.sf-express.com/std/service",
		TrackingURL:     "https://bspgw.sf-express.com/std/service",
		OrderCreateURL:  "https://bspgw.sf-express.com/std/service",
		LabelURL:        "https://bspgw.sf-express.com/std/service",
	},
	"JD": {
		VerificationURL: "https://api.jd.com/routerjson",
		TrackingURL:     "https://api.jd.com/routerjson",
		OrderCreateURL:  "https://api.jd.com/routerjson",
		LabelURL:        "https://api.jd.com/routerjson",
	},
	"ZTO": {
		VerificationURL: "https://japi.zto.com",
		TrackingURL:     "https://japi.zto.com",
		LabelURL:        "https://japi.zto.com",
	},
	"YTO": {
		VerificationURL: "http://openapi.yto.net.cn/open/ic/api",
		TrackingURL:     "http://openapi.yto.net.cn/open/ic/api",
		LabelURL:        "http://openapi.yto.net.cn/open/ic/api",
	},
	"YD": {
		VerificationURL: "http://openapi.yundasys.com/api",
		TrackingURL:     "http://openapi.yundasys.com/api",
		LabelURL:        "http://openapi.yundasys.com/api",
	},
	"JTSD": {
		VerificationURL: "https://openapi.jtexpress.com.cn",
		TrackingURL:     "https://openapi.jtexpress.com.cn",
		LabelURL:        "https://openapi.jtexpress.com.cn",
	},
}

func ResolveTrustedLogisticsProviderTarget(code string, purpose LogisticsProviderTargetPurpose) LogisticsProviderTargetResolution {
	normalizedCode := strings.ToUpper(strings.TrimSpace(code))
	resolution := LogisticsProviderTargetResolution{
		ProviderCode: normalizedCode,
		Purpose:      purpose,
	}
	if normalizedCode == "" {
		resolution.ManualReview = true
		resolution.SummaryMessage = "provider code is required"
		resolution.ActionMessage = "请先补齐物流服务商编码。"
		return resolution
	}

	profile, ok := trustedLogisticsProviderTargets[normalizedCode]
	if !ok {
		resolution.ManualReview = true
		resolution.SummaryMessage = "trusted target is not configured for this provider"
		resolution.ActionMessage = "当前厂商未启用系统内置受控目标，请改用人工联调或选择受支持模板。"
		return resolution
	}

	switch purpose {
	case LogisticsProviderTargetPurposeVerify:
		resolution.TargetURL = strings.TrimSpace(profile.VerificationURL)
	case LogisticsProviderTargetPurposeTracking:
		resolution.TargetURL = strings.TrimSpace(profile.TrackingURL)
	case LogisticsProviderTargetPurposeOrderCreate:
		resolution.TargetURL = strings.TrimSpace(profile.OrderCreateURL)
	case LogisticsProviderTargetPurposeLabel:
		resolution.TargetURL = strings.TrimSpace(profile.LabelURL)
	default:
		resolution.ManualReview = true
		resolution.SummaryMessage = "target purpose is not supported"
		resolution.ActionMessage = "当前物流能力用途未启用系统内置受控目标，请联系系统管理员。"
		return resolution
	}

	if resolution.TargetURL == "" {
		resolution.ManualReview = true
		resolution.SummaryMessage = "trusted target is not available for this provider purpose"
		resolution.ActionMessage = "当前厂商未启用对应能力的系统内置受控目标，请改用人工联调。"
		return resolution
	}

	resolution.Supported = true
	resolution.SummaryMessage = "trusted target resolved"
	resolution.ActionMessage = "系统内置受控目标已就绪，可继续执行受控验证或联调。"
	return resolution
}
