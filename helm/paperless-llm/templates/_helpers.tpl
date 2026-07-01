{{- define "paperless-llm.database.host" -}}{{ .Values.externalDatabase.host }}{{- end }}
{{- define "paperless-llm.database.port" -}}{{ .Values.externalDatabase.port }}{{- end }}
{{- define "paperless-llm.database.username" -}}{{ .Values.externalDatabase.username }}{{- end }}
{{- define "paperless-llm.database.password" -}}{{ .Values.externalDatabase.password }}{{- end }}
{{- define "paperless-llm.database.name" -}}{{ .Values.externalDatabase.database }}{{- end }}

{{- define "paperless-llm.redis.fullname" -}}
{{- printf "%s-redis" .Release.Name -}}
{{- end }}

{{/*
Resolved Redis connection, using the in-cluster deployment when enabled,
otherwise falling back to externalRedis.
*/}}
{{- define "paperless-llm.redis.host" -}}
{{- if .Values.redis.enabled }}{{ include "paperless-llm.redis.fullname" . }}{{- else }}{{ .Values.externalRedis.host }}{{- end }}
{{- end }}

{{- define "paperless-llm.redis.port" -}}
{{- if .Values.redis.enabled }}6379{{- else }}{{ .Values.externalRedis.port }}{{- end }}
{{- end }}

{{- define "paperless-llm.redis.username" -}}
{{- if .Values.redis.enabled }}{{- else }}{{ .Values.externalRedis.username }}{{- end }}
{{- end }}

{{- define "paperless-llm.redis.password" -}}
{{- if .Values.redis.enabled }}{{- else }}{{ .Values.externalRedis.password }}{{- end }}
{{- end }}

{{- define "paperless-llm.redis.db" -}}
{{- if .Values.redis.enabled }}0{{- else }}{{ .Values.externalRedis.db }}{{- end }}
{{- end }}

{{/*
Backend Service name, shared between the backend Service template and the
frontend's default apiBaseUrl.
*/}}
{{- define "paperless-llm.backend.fullname" -}}
{{- printf "%s-backend" .Release.Name -}}
{{- end }}

{{- define "paperless-llm.worker.fullname" -}}
{{- printf "%s-worker" .Release.Name -}}
{{- end }}

{{/*
Shared config Secret name, mounted by both the backend and worker Deployments.
*/}}
{{- define "paperless-llm.config.fullname" -}}
{{- printf "%s-config" .Release.Name -}}
{{- end }}

{{- define "paperless-llm.frontend.fullname" -}}
{{- printf "%s-frontend" .Release.Name -}}
{{- end }}
