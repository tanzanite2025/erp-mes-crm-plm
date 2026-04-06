package middleware

import (
	"xdfc-server/dependencies"
	"xdfc-server/models"
)

type EffectiveAccessProfile = dependencies.EffectiveAccessProfile

func ResolveEffectiveAccessProfileForUser(user models.User) EffectiveAccessProfile {
	return dependencies.ResolveEffectiveAccessProfileForUser(user)
}
