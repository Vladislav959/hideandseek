//declaration of variables

const { captureRejectionSymbol } = require("events");
const express = require("express");
const app = express();
const users = [];
const usersPrivate = [];
const roomsData = [];

const server = require("http").createServer(app);
const io = require("socket.io")(server);
//declaration of functions
function createRoom(roomId,creatorId,mode,count){
    const room = {roomId,creatorId,state:0,mode,playersMax:parseInt(count,10),playersCount:1};
    roomsData.push(room);
}

function createUser(id, username, roomId) {
  const user = { id, username, roomId};
  users.push(user);
  return user;
}

function getUser(id) {
  return users.find(user => user.id === id);
}
function roomExists(roomId){
    let found = false;
    for(let i = 0; i < roomsData.length; i++) {
        if (roomsData[i].roomId == roomId) {
            found = true;
            break;
        }
    }
return found;
}
function userToGame(id){
    let index = users.findIndex(user => user.id === id);
    console.log('INDEX:' + index)
    if(users[index].inGame = true){
        return true;
    }
    else{
        return false;
    }
}


function checkCreatority(roomId, socketId){
let room = roomsData.find(room => room.roomId = roomId);
if(room.creatorId == socketId){
    return true;
}
else{
   console.log(socketId);
    console.log(room.creatorId);
    return false;
}
}

function usernameExists(roomId,username){
    let usersFiltered = users.filter(user => user.roomId == roomId);
    let found = false;
    for(let i = 0; i < usersFiltered.length; i++) {
        if (usersFiltered[i].username == username) {
            found = true;
            break;
        }
    }
    return found;
}

function quitUser(id) {
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

function getRoomUsernames(roomId) {
let arr = [];
  users.filter(user => user.roomId == roomId).forEach(user=>{
arr.push(user.username);
console.log(user.username)
  })
  return arr;
}
function getRoomOptions(roomId){
    let room = roomsData.find(room => room.roomId == roomId);
    return {mode:room.mode,playersMax:room.playersMax}
}
function getRoomState(roomId){
    console.log(roomId);
    console.log(users);
    let room = roomsData.find(room => room.roomId == roomId);
    return parseInt(room.state,10);
}
const roomSocket = io.of('/room');

//waiting in room
roomSocket.on("connection",(socket)=>{
    usersPrivate.push({id:socket.id,toGame:false});
	socket.on("join room",(data)=>{
        console.log('joining');
        if(!roomExists(data.roomId)){
            createRoom(data.roomId,socket.id,data.gameOptions.mode,data.gameOptions.count);
            const user = createUser(socket.id,data.username,data.roomId);
            socket.join(user.roomId);
            socket.emit('get id',socket.id);
            socket.emit('get permissions',true);
            socket.emit('roomOptions',getRoomOptions(user.roomId));
		    roomSocket.to(user.roomId).emit('roomUsers',getRoomUsernames(user.roomId));
            console.log(users);
        }
        else{
            if(usernameExists(data.roomId,data.username)){
                socket.emit('username exists',true);
            }
            else{
                
        if(getRoomState(data.roomId) == 0){
            const user = createUser(socket.id,data.username,data.roomId);
            socket.join(user.roomId);
            let roomIndex = roomsData.findIndex(room => room.roomId == user.roomId);
            roomsData[roomIndex].playersCount++;
            socket.emit('get id',socket.id);
            socket.emit('roomOptions',getRoomOptions(user.roomId));
            roomSocket.to(user.roomId).emit('roomUsers',getRoomUsernames(user.roomId));
            console.log(roomsData);
          if(roomsData[roomIndex].playersMax == roomsData[roomIndex].playersCount){
              roomSocket.to(user.roomId).emit('countdown',true);
              global.gameCountdown = setTimeout(function(){
                console.log('FINALLYYYYYY');
               usersPrivate.forEach(user=>{
user.toGame = true;
               })
               roomSocket.to(user.roomId).emit("game start",true)
              },7000)
          }
        }
        else{
            socket.emit('redirect',true);
        }
            }
        } 
    
    });
    socket.on("start game", data => {
        console.log('1')
        if(checkCreatority(data.room,data.id)){
            console.log('2')
            roomSocket.to(data.room).emit("preparing game",true);
            roomsData[roomsData.findIndex(room => room.roomId == data.room)].state = 1;
            
        if(global.gameCountdown !== undefined){
            clearTimeout(global.gameCountdown);
        }
        }
    })
    socket.on("delete room", data => {
        console.log('01')
        if(checkCreatority(data.room,data.id)){
            console.log('02')
            roomSocket.to(data.room).emit("room delete",true);
        }
    })
    socket.on("go to game", data => {
        console.log('3')
            let privateNumber = usersPrivate.findIndex(x => x.id === socket.id);
            console.log(privateNumber);
           usersPrivate[privateNumber].toGame = true;
           socket.emit("game start",true)
    })
	socket.on('disconnect',()=>{
        console.log(socket.id);
        const user = getUser(socket.id);
        if(user !== undefined){
            
            let privateNumber = usersPrivate.findIndex(x => x.id === socket.id);
            console.log('SOCKET NOW: '+usersPrivate[privateNumber].toGame);
            console.log('private value:' + usersPrivate[privateNumber].toGame);
if(usersPrivate[privateNumber].toGame !== true){
    console.log('DELETING!!!')
        let roomId_s = user.roomId;
        const deleting = quitUser(socket.id);
        
		if(getRoomUsernames(roomId_s).length > 0){
		if(deleting){
        }
        let roomIndex = roomsData.findIndex(room => room.roomId == roomId_s);
        if(global.gameCountdown !== undefined){
            roomSocket.to(roomId_s).emit('countdown stopped',true)
            clearTimeout(global.gameCountdown);
        }
        roomsData[roomIndex].playersCount--;
        if(checkCreatority(user.roomId,user.id)){
		roomSocket.to(user.roomId).emit('console log','testing');
           roomsData[roomsData.findIndex(room => room.roomId == user.roomId)].creatorId = users[Math.floor(Math.random() * users.filter(item => item.roomId == user.roomId).length++)].id;
       
           roomSocket.to(roomsData[roomsData.findIndex(room => room.roomId == user.roomId)].creatorId).emit('get permissions',true);
        }
        else{
            console.log('gh')
        }
		roomSocket.to(user.roomId).emit('user left',user.username);
		roomSocket.to(user.roomId).emit('roomUsers',getRoomUsernames(roomId_s));
    }
else{
    roomsData.splice(roomsData.findIndex(room=> room.roomId == roomId_s,1));
    
    console.log(roomsData);
}
}
}
	})
})


const gameSocket = io.of('/game');
gameSocket.on('connection', socket => {
    socket.on('user join',data => {
        try{
        const curUser = getUser(data);
        if(getRoomState(curUser.roomId) != 2){
        socket.join(curUser.roomId);
       
console.log(curUser);
        
        console.log('JOINED!!!')
        console.log(curUser.roomId);
        users[users.findIndex(user => user.id == data)].id = socket.id;
        if(socket.emit('receive data',getUser(socket.id))){
            console.log('hukjl')
        }
    }
    else{
        socket.emit('redirect',true);
        console.log('ertyuio')
    }
    }
    catch{
        socket.emit('redirect',true);
    }
    })
    socket.on('map load',data=>{
        console.debug('debugger','color:yellow;font-weight:300')
        if(userToGame(data)){
            console.log('in game')
        }
        console.log(users);
        let curRoomId = getUser(data).roomId; 
            if(users.filter(user => user.roomId == curRoomId).every(user => user.inGame === true)){
                gameSocket.to(curRoomId).emit('all in game',true);console.log('finally');
                let index = users.findIndex(room => room.roomId == curRoomId);
            roomsData[index].state = 2;
            }
    })
    socket.on('location',(data)=>{
        console.log('yo id:'+data.id)
        console.log('sent location to all 2');
        const user = getUser(data.id);
        console.log(data.longitude);
        gameSocket.to(user.roomId).emit('usersLocation',{longitude:data.longitude,latitude:data.latitude,name:user.username});
    })
    socket.on('firstLocation',(data)=>{
        const user = getUser(data.id);

        console.log('first:'+data.longitude);
        gameSocket.to(user.roomId).emit('getFirstLocation',{longitude:data.longitude,latitude:data.latitude,name:user.username});
    })
    socket.on('disconnect',()=>{
        let user;
        if(user = getUser(socket.id)){
        console.log('lefting:'+user.roomId);
        quitUser(socket.id);
        let index = roomsData.findIndex(room => room.roomId == user.roomId);
        roomsData[index].playersCount--;
        console.log( roomsData[index].playersCount);
        if(roomsData[index].playersCount > 1){
            gameSocket.to(user.roomId).emit('user left',user.username);
        }
        else{
            console.log('whaaat');
        }
    }
    })
})
app.use(express.static(__dirname + '/'))

app.get('/room',(req,res)=>{
res.sendFile(__dirname + '/views/room.html');
})
app.get('/create',(req,res)=>{
    res.sendFile(__dirname + '/views/create.html');
    })
    app.get('/game',(req,res)=>{
        res.sendFile(__dirname + '/views/game.html');
        })
app.post('/api/room/:roomId',(req,res)=>{
let roomState = 'not exists';
roomsData.forEach((room)=>{
    if(room.roomId == req.params.roomId){
        if(room.state == 2 || room.state == 3){
            roomState = 'game';
        }
        else if(room.playersMax == room.playersCount && (room.state != 2 && room.state != 3)){
            roomState = 'full';
        }
        else{
        roomState = 'exists';
        }
    }
})
    
console.log(roomState);
res.send(roomState);
})
app.post('/api/name/',(req,res)=>{
    let nameExists = false;
    let roomId = req.query.roomId;
    let userName = req.query.name;
    getRoomUsernames(roomId).forEach(name => {
        if(userName == name){
            nameExists = true;
        }
    })
    res.send(nameExists);
    })
app.get('/',(req,res)=>{
    res.sendFile(__dirname + '/views/home.html');
})

server.listen(3000);
