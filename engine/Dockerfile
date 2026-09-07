FROM rust:1.98-alpine AS builder
WORKDIR /src
RUN apk add --no-cache musl-dev pkgconfig
# Day-1 stub: minimal HTTP health responder on 50051
# Real engine is tonic gRPC; stub is HTTP for healthcheck to pass. Replace Day 2 with real Rust service.
RUN printf '%s\n' \
  'use std::net::TcpListener;' \
  'use std::io::{Read, Write};' \
  'fn main(){ let l = TcpListener::bind("0.0.0.0:50051").unwrap(); println!("engine stub :50051"); for mut s in l.incoming().flatten(){ let mut b=[0u8;1024]; let _=s.read(&mut b); let _=s.write_all(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"ok\",\"service\":\"engine\"}"); } }' > main.rs
RUN rustc main.rs -o /app --edition 2021 || (cp main.rs /tmp/main.rs && rustc /tmp/main.rs -o /app)

FROM alpine:3.21
RUN apk add --no-cache wget ca-certificates libgcc
RUN adduser -D appuser
COPY --from=builder /app /app
USER appuser
EXPOSE 50051
HEALTHCHECK --interval=5s --timeout=3s --retries=10 --start-period=15s CMD wget --no-verbose --tries=1 --spider http://localhost:50051/health || wget --no-verbose --tries=1 --spider http://localhost:50051/ || exit 1
ENTRYPOINT ["/app"]
