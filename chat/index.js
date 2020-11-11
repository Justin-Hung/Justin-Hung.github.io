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
    //username msg and chat array
    socket.on('cookie username', (msg) => {
        cookieUsername = msg; 
        let username = '';
        
        if( cookieUsername !== '' && !usernameArray.includes(username) ) {
            username = cookieUsername;
            usernameArray.push(cookieUsername);
        }
        else {
            username = generateUsername();
        }
        console.log('a user connected using username: ' + username); 
        socket.emit('username message', username);
        socket.emit('chat array', chatArray); 
    });

    //messaging
    socket.on('chat message', (msg) => {
        message = checkForEmojis(msg);
        let date = new Date(); 
        let chatObject = {
            hour: date.getHours(),
            minute: padZero(date.getMinutes()),
            msg: message
        }
        chatArray.push(chatObject);
        io.emit('chat message', chatObject);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('disconnect username', (disconnectUser) => {
        removeFromUsernameArray(disconnectUser);
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

function removeFromUsernameArray(username) {
    for( let i = 0 ; i < usernameArray.length ; i++ ) {
        if( username === usernameArray[i] ) {
            usernameArray.splice(i, 1);
        }
    }
}
