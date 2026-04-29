#!/usr/bin/expect -f
set timeout 300

spawn npx drizzle-kit generate

while {1} {
    expect {
        "create column" {
            send "\r"
        }
        "rename column" {
            send "\r"
        }
        "1 migration" {
            break
        }
        "migrations" {
            break
        }
        eof {
            break
        }
        timeout {
            break
        }
    }
}

wait
