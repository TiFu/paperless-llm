{{/*
Resolved Postgres connection, using the bundled Bitnami subchart when enabled,
otherwise falling back to externalDatabase.
*/}}
{{- define "paperless-llm.database.host" -}}
{{- if .Values.postgresql.enabled }}{{ printf "%s-postgresql" .Release.Name }}{{- else }}{{ .Values.externalDatabase.host }}{{- end }}
{{- end }}

{{- define "paperless-llm.database.port" -}}
{{- if .Values.postgresql.enabled }}5432{{- else }}{{ .Values.externalDatabase.port }}{{- end }}
{{- end }}

{{- define "paperless-llm.database.username" -}}
{{- if .Values.postgresql.enabled }}{{ .Values.postgresql.auth.username }}{{- else }}{{ .Values.externalDatabase.username }}{{- end }}
{{- end }}

{{- define "paperless-llm.database.password" -}}
{{- if .Values.postgresql.enabled }}{{ .Values.postgresql.auth.password }}{{- else }}{{ .Values.externalDatabase.password }}{{- end }}
{{- end }}

{{- define "paperless-llm.database.name" -}}
{{- if .Values.postgresql.enabled }}{{ .Values.postgresql.auth.database }}{{- else }}{{ .Values.externalDatabase.database }}{{- end }}
{{- end }}

{{/*
Resolved Redis connection, using the bundled Bitnami subchart when enabled,
otherwise falling back to externalRedis.
*/}}
{{- define "paperless-llm.redis.host" -}}
{{- if .Values.redis.enabled }}{{ printf "%s-redis-master" .Release.Name }}{{- else }}{{ .Values.externalRedis.host }}{{- end }}
{{- end }}

{{- define "paperless-llm.redis.port" -}}
{{- if .Values.redis.enabled }}6379{{- else }}{{ .Values.externalRedis.port }}{{- end }}
{{- end }}

{{- define "paperless-llm.redis.username" -}}
{{- if .Values.redis.enabled }}{{- else }}{{ .Values.externalRedis.username }}{{- end }}
{{- end }}

{{- define "paperless-llm.redis.password" -}}
{{- if .Values.redis.enabled }}{{ .Values.redis.auth.password }}{{- else }}{{ .Values.externalRedis.password }}{{- end }}
{{- end }}

{{- define "paperless-llm.redis.db" -}}
{{- if .Values.redis.enabled }}0{{- else }}{{ .Values.externalRedis.db }}{{- end }}
{{- end }}

{{/*
Server Service name, shared between the server Service template and the
frontend's default apiBaseUrl.
*/}}
{{- define "paperless-llm.server.fullname" -}}
{{- printf "%s-server" .Release.Name -}}
{{- end }}

{{- define "paperless-llm.frontend.fullname" -}}
{{- printf "%s-frontend" .Release.Name -}}
{{- end }}
