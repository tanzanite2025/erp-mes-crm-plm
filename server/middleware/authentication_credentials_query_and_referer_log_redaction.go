package middleware

import (
	"net/url"
	"strings"
)

func redactAuthenticationCredentialsFromLoggedQueryString(rawQuery string) string {
	if rawQuery == "" {
		return ""
	}
	parameters, err := url.ParseQuery(rawQuery)
	if err != nil {
		// Partial parsing could leave an encoded credential in the raw remainder.
		return "[REDACTED_INVALID_QUERY]"
	}
	for name := range parameters {
		normalizedName := strings.ToLower(strings.NewReplacer("_", "", "-", "", ".", "").Replace(name))
		switch normalizedName {
		case "ticket", "wsticket", "token", "accesstoken", "refreshtoken", "idtoken", "authorization", "csrftoken", "apikey", "secret", "clientsecret", "password", "currentpassword", "newpassword", "confirmnewpassword":
			parameters[name] = []string{"[REDACTED]"}
		}
	}
	return parameters.Encode()
}

func redactAuthenticationCredentialsFromLoggedReferer(rawReferer string) string {
	if rawReferer == "" {
		return ""
	}
	referer, err := url.Parse(rawReferer)
	if err != nil {
		return "[REDACTED_INVALID_REFERER]"
	}
	referer.User = nil
	referer.Fragment = ""
	referer.RawFragment = ""
	referer.RawQuery = redactAuthenticationCredentialsFromLoggedQueryString(referer.RawQuery)
	return referer.String()
}
