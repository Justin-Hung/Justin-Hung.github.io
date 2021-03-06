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
        
        console.log('cookieUsername', cookieUsername);
        console.log('isUsernameExist:');
        console.log(isUsernameExist(cookieUsername))
        if( cookieUsername !== '' && !isUsernameExist(cookieUsername) ) {
            username = cookieUsername;
            usernameArray.push( {username: cookieUsername, socket: socket.id} );
            console.log('username array on connection: ');
            console.log(usernameArray);
            io.emit('update current users', usernameArray);
        }
        else {
            username = generateUsername(socket);
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
        console.log('disconnect');
        for (let i = 0 ; i < usernameArray.length; i++) {
            if (socket.id === usernameArray[i].socket) {
                console.log('user disconnected: ', usernameArray[i].username);
                removeFromUsernameArray(usernameArray[i].username);
                break;
            }
        }
        io.emit('update current users', usernameArray);
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

function generateUsername(socket) {
    let username = 'User' + usernameId;
    usernameId++;
    
    for( let i = 0 ; i < usernameArray.length ; i++) {
        if (username === usernameArray[i].username) {
            username = 'user' + usernameId;
            usernameId++;
        }
    }

    usernameArray.push({username: username, socket: socket.id});
    io.emit('update current users', usernameArray);
    colorDict[username] = "#000000";
    return username; 
}

function removeFromUsernameArray(username) {
    for( let i = 0 ; i < usernameArray.length ; i++ ) {
        if( username === usernameArray[i].username ) {
            console.log('removing: ', usernameArray[i]);
            usernameArray.splice(i, 1);
            break;
        }
    }
    console.log('username array after remove of username: ', username);
    console.log(usernameArray);
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
    if ( !isUsernameExist(newUsername) ) {
        colorDict[newUsername] = colorDict[previousUsername];
        delete colorDict[previousUsername];
        removeFromUsernameArray(previousUsername);
        usernameArray.push({username: newUsername, socket: socket.id});
        io.emit('update current users', usernameArray);

        socket.emit('username message', newUsername );

        for (let i = 0; i < chatArray.length; i++) {
            if ( previousUsername === chatArray[i].username ) {
                chatArray[i].username = newUsername; 
            }
        }

        let chatArrayObject = {
            isRefresh: true,
            chatArray: chatArray
        }
        io.emit('chat array', chatArrayObject); 
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


function isUsernameExist( username ) {
    for (let i = 0 ; i < usernameArray.length ; i++ ) {
        if (usernameArray[i].username === username) {
            return true;
        }
    }
    return false;
}