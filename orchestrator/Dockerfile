FROM golang:1.26-alpine AS builder
WORKDIR /src
RUN apk add --no-cache git
# Create minimal Day-1 stub server — will be replaced by real cmd/server/main.go on Day 1-2
RUN printf '%s\n' \
  'package main' \
  'import ("encoding/json";"net/http";"log")' \
  'func main(){' \
  ' http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request){ json.NewEncoder(w).Encode(map[string]string{"status":"ok","service":"orchestrator"}) })' \
  ' http.HandleFunc("/passes", func(w http.ResponseWriter, r *http.Request){ w.Header().Set("Content-Type","application/json"); w.Write([]byte(`[]`)) })' \
  ' http.HandleFunc("/schedule", func(w http.ResponseWriter, r *http.Request){ w.Header().Set("Content-Type","application/json"); w.Write([]byte(`[]`)) })' \
  ' http.HandleFunc("/schedule/generate", func(w http.ResponseWriter, r *http.Request){ w.Header().Set("Content-Type","application/json"); w.Write([]byte(`{"booked":0}`)) })' \
  ' log.Println("orchestrator stub listening :8080"); log.Fatal(http.ListenAndServe(":8080", nil))' \
  '}' > main.go
RUN go mod init stub && go mod tidy && CGO_ENABLED=0 go build -o /app main.go

FROM alpine:3.21
RUN apk add --no-cache wget ca-certificates
RUN adduser -D appuser
COPY --from=builder /app /app
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --retries=10 --start-period=15s CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
ENTRYPOINT ["/app"]
