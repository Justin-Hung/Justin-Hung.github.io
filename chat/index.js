var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
let chatArray = [];
let usernameId = 1; 
let usernameArray = [];

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    let generatedUsername = generateUsername();
    console.log('a user connected: ' + generatedUsername); 
    socket.emit('username message', generatedUsername);
    socket.emit('chat array', chatArray);

    //messaging
    socket.on('chat message', (msg) => {
        msg = checkForEmojis(msg);
        let date = new Date(); 
        let chatObject = {
            username: generatedUsername,
            hour: date.getHours(),
            minute: padZero(date.getMinutes()),
            msg: msg
        }
        chatArray.push(chatObject);
        io.emit('chat message', chatObject);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});

function checkForEmojis( message ) {
    message = message.split(':)').join('😁');
    message = message.split(':(').join('🙁');
    message = message.split(':o').join('😲');
    message = message.split('lit').join('🔥');
    return message;
}

function padZero( number ) {
    if (number < 10) {
        return '0' + number; 
    }
    return number;
}

function generateUsername() {
    let username = 'User' + usernameId;
    usernameId++;
    
    for( let i = 0 ; i < usernameArray.length ; i++) {
        if (username === usernameArray[i]) {
            username = 'user' + usernameId;
            usernameId++;
        }
    }

    usernameArray.push(username);
    return username; 
}

