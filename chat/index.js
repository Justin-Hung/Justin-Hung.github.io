var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
let chatArray = [];
let usernameId = 1; 
let usernameArray = [];
let colorDict = {};

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
            colorDict[cookieUsername] = "#000000";
        }
        else {
            username = generateUsername();
        }

        console.log('a user connected using username: ' + username); 
        socket.emit('username message', username);

        let chatArrayObject = {
            isRefresh: false,
            chatArray: chatArray
        }
        socket.emit('chat array', chatArrayObject); 
    });

    //messaging
    socket.on('chat message', (fullmsg) => {
        let username = fullmsg.substr( 0, fullmsg.indexOf(':') );
        let msg = fullmsg.substr( username.length + 2 );  
        if ( msg.startsWith('/') ) {
            handleCommands(msg, username, socket, io);
        }
        else {
            sendMessage( username, msg, io );
        }
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

function sendMessage( username, msg, io ) {
    msg = checkForEmojis(msg);
    let date = new Date(); 
    let chatObject = {
        hour: date.getHours(),
        minute: padZero(date.getMinutes()),
        username: username,
        color: colorDict[username],
        msg: msg
    }
    chatArray.push(chatObject);
    io.emit('chat message', chatObject);
}

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
    colorDict[username] = "#000000";
    return username; 
}

function removeFromUsernameArray(username) {
    delete colorDict[username];
    for( let i = 0 ; i < usernameArray.length ; i++ ) {
        if( username === usernameArray[i] ) {
            usernameArray.splice(i, 1);
        }
    }
}

function handleCommands(message, username, socket, io) {
    let command = message.substr( 0, message.indexOf(' ') );
    let commandValue = message.substr( message.indexOf(' ') + 1 );
    switch (command) {
        case '/name':
            changeUsername( username, commandValue, socket );
            break;
        case '/color':
            changeColor(username, commandValue, io);
            break;
    }
}

function changeUsername(previousUsername, newUsername, socket) {
    let isUsernameChanged = false; 
    if ( !usernameArray.includes(newUsername) ) {
        colorDict[newUsername] = colorDict[previousUsername];
        removeFromUsernameArray(previousUsername);
        usernameArray.push(newUsername);
        isUsernameChanged = true;
    }

    socket.emit('username change status', isUsernameChanged );
    if ( isUsernameChanged ) {
        socket.emit('username message', newUsername );
    }
}

function changeColor(username, color, io) {
    colorDict[username] = "#" + color;
    for (let i = 0; i < chatArray.length; i++) {
        if ( username === chatArray[i].username ) {
            chatArray[i].color = "#" + color; 
        }
    }
    
    let chatArrayObject = {
        isRefresh: true,
        chatArray: chatArray
    }
    io.emit('chat array', chatArrayObject); 
}