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

{{/*
Rendered config.yaml, shared by config-secret.yaml (plain Secret from values)
and externalsecret-config.yaml (ESO template filled from Vault). Called with a
dict: root (the chart context) plus dbUsername, dbPassword and jwtSecret,
already rendered as YAML scalars by the caller.
*/}}
{{- define "paperless-llm.configYaml" -}}
{{- $root := .root -}}
database:
  host: {{ include "paperless-llm.database.host" $root | quote }}
  port: {{ include "paperless-llm.database.port" $root }}
  username: {{ .dbUsername }}
  password: {{ .dbPassword }}
  database: {{ include "paperless-llm.database.name" $root | quote }}

redis:
  host: {{ include "paperless-llm.redis.host" $root | quote }}
  port: {{ include "paperless-llm.redis.port" $root }}
  username: {{ include "paperless-llm.redis.username" $root | quote }}
  password: {{ include "paperless-llm.redis.password" $root | quote }}
  db: {{ include "paperless-llm.redis.db" $root }}
  ttlInSeconds: {{ $root.Values.config.redisCache.ttlInSeconds }}
  reconnectBaseDelayMs: {{ $root.Values.config.redisCache.reconnectBaseDelayMs }}
  reconnectMaxDelayMs: {{ $root.Values.config.redisCache.reconnectMaxDelayMs }}

paperless:
  url: {{ $root.Values.config.paperless.url | quote }}

llm:
  url: {{ $root.Values.config.llm.url | quote }}

workers:
  instanceId: {{ $root.Values.config.workers.instanceId | default "null" }}

logging:
  level: {{ $root.Values.config.logging.level | quote }}
  pretty: {{ $root.Values.config.logging.pretty }}

api:
  port: {{ $root.Values.config.api.port }}
  corsOrigins:
    {{- range $root.Values.config.api.corsOrigins }}
    - {{ . | quote }}
    {{- end }}

auth:
  jwtSecret: {{ .jwtSecret }}
  jwtExpiresIn: {{ $root.Values.config.auth.jwtExpiresIn | quote }}
{{- end }}
