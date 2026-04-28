FROM golang:1.25-alpine AS builder
RUN apk add --no-cache git
RUN git clone https://github.com/gensyn-ai/axl.git /build
WORKDIR /build
RUN go build -o node ./cmd/node

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
COPY --from=builder /build/node /app/node
WORKDIR /app
ENTRYPOINT ["/app/node"]
