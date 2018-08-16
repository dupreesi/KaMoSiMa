const http = require('http');
const fs = require('fs');
const pg = require('pg');
const querystring = require('querystring');
const mime = require('mime-types');
const path = require('path');
const dbQuery = require('./dbQueries');
const cookie = require('cookie')
const jwt = require('jsonwebtoken');

const buildPath = (mypath) => {
    return path.join(__dirname, '..', mypath);
}

const isAuth = (userCookie, callback) => {
    if (userCookie) {
        console.log(`user provided cookie: ${userCookie}`);
        let parsedCookie = cookie.parse(userCookie);
        jwt.verify(parsedCookie['data'], process.env.JWT_SECRET, (err, decoded) => {
            if (err || !decoded['logged_in']) {
                callback("error");
            }
            callback(null, decoded['logged_in']);
        });
    } else {
        callback("error");
    }
}

const router = (request, response) => {
    const endpoint = request.url.split('/')[1];
    const extension = request.url.split('/')[2];
    const method = request.method;

    if (endpoint === '') {
        fs.readFile(__dirname + '/../public/index.html', (err, file) => {
            if (err) {
                response.writeHead(500, { 'content-type': 'text/plain' });
                response.end('file not found, sry');
            } else {
                response.writeHead(200, { 'content-type': 'text/html' });
                response.end(file);
            }
        });
    } else if (endpoint === 'auth') {
        const cookie = request.headers.cookie;
        isAuth(cookie, (err, res) => {
            if (err) {
                console.log(err)
                response.writeHead(401, { "Content-Type": "text/plain" });
                response.end("401 Forbidden");
            }
            response.writeHead(200, { "Content-Type": "text/plain" });
            response.end("Authenticated!");
        });
    } else if (endpoint === 'register') {
        console.log("user registering...");

        let postData = '';
        request.on('data', (chunk) => {
            postData += chunk;
        });
        request.on('end', () => {
            console.log(postData);
            // get data and parse it
            // get it in the db
            response.writeHead(302, { "Location": "/" });
            response.end();
        });
    } else if (endpoint === 'login') {
        jwt.sign({ logged_in: true }, process.env.JWT_SECRET, {}, (err, token) => {
            response.writeHead(302, {
                'Location': '/',
                'Set-Cookie': 'data=' + token + '; HttpOnly; Max-Age=9000'
            });
            return response.end();
        });
    } else if (endpoint === 'logout') {
        response.writeHead(302, {
            'Location': '/',
            'Set-Cookie': 'logged_in=false; HttpOnly; Max-Age=0'
        });
        response.end();
    } else if (endpoint === 'seedogs') {
        fs.readFile(path.join(__dirname, '..', '/public/seedogs.html'), (err, file) => {
            if (err) {
                response.writeHead(500, { 'content-type': 'text/plain' });
                response.end('server error seedogs');
            }
            response.writeHead(200, { 'content-type': mime.lookup(request.url) });
            response.end(file);
        });
    } else if (endpoint === 'sawdogs') {
        const readCookie = request.headers.cookie;
        if (readCookie && readCookie.match(/logged_in=true/)) {
            fs.readFile(path.join(__dirname, '..', '/public/sawdogs.html'), (err, file) => {
                if (err) {
                    response.writeHead(500, { 'content-type': 'text/plain' });
                    response.end('server error sawdogs auth');
                }
                response.writeHead(200, { 'content-type': mime.lookup(request.url) });
                response.end(file);
            });
        } else {
            //redirect to login
            const message = 'Fail whale'
            response.writeHead(401, {
                'Content-Type': 'text/plain',
                'Content-Length': message.length
            });
            return response.end(message);
        }
    } else if (request.url.includes('public')) {
        fs.readFile(buildPath(request.url), (err, file) => {
            if (err) {
                response.writeHead(500, { 'content-type': 'text/plain' });
                response.end('server error public');
            }
            response.writeHead(200, { 'content-type': mime.lookup(request.url) });
            response.end(file);
        });

    } else if (endpoint === 'spots') {
        dbQuery.getDoggo((err, res) => {
            if (err) {
                response.writeHead(500, { 'content-type': 'text/plain' });
                response.end('server error spots');
            }
            response.writeHead(200, { 'content-type': mime.lookup('json') });
            response.end(JSON.stringify(res.rows));
        });
    } else if (endpoint === 'breeds') {
        dbQuery.breedDoggo((err, res) => {
            if (err) {
                response.writeHead(500, { 'content-type': 'text/plain' });
                response.end('server error breeds');
            }
            response.writeHead(200, { 'content-type': mime.lookup('json') });
            response.end(JSON.stringify(res.rows));
        });
    } else if (endpoint === 'create-spots') {
        let postData = '';
        request.on('data', (chunk) => {
            postData += chunk;
        });
        request.on('end', () => {
            console.log(postData);
            const dogName = querystring.parse(postData).dogName;
            const dogBreed = querystring.parse(postData).dogBreed;
            const parkName = querystring.parse(postData).parkName;
            dbQuery.postDoggo(dogName, dogBreed, parkName, (err, res) => {
                if (err) {
                    response.writeHead(500, 'content-type : text/html');
                    response.end();
                }
                response.writeHead(302, { "Location": "/public/seedogs.html" });
                response.end();
            })
        });
    } else {
        response.writeHead(404, { 'content-type': 'text/html' });
        response.end('Page doesn´t exist');
    }
}

module.exports = router;