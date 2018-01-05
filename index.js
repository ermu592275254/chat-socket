const app = require('http').createServer(handler);
const crypto = require('crypto');
const fs = require('fs');
const Server = require('socket.io');
const io = new Server(app);
const host = 'localhost';
const port = 3000;

app.listen(port,host);

function handler(req, res) {
    // 根据请求路径返回图片
    fs.readFile(__dirname + req.url, function(err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Invalid resource path');
            }
            res.writeHead(200);
            res.end(data);
        });
}
new (require("./socket").init)(io,host,port);

console.log(`server on ${host}:${port}`);