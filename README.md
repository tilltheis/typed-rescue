# Typed Rescue
For The Special People

# Building
`fswatch -o src | xargs -n1 -I{} sh -c 'printf ... ; tsc src/*.ts --outFile lib/rescue.js --sourceMap ; echo done ;'`

# Running
`python -m SimpleHTTPServer 8080`

`open http://localhost:8080`