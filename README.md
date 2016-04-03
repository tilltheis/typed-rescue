# Typed Rescue
For The Special People

# Building
`tsc` or build it continually with `fswatch -o src | xargs -n1 -I{} sh -c 'printf ... ; tsc ; echo done ;'`

# Running
`python -m SimpleHTTPServer 8080` (Python 2) or `python -m http.server 8080` (Python 3) 

`open http://localhost:8080`