const crypto = require('crypto');
const common = require('./common');
const userModel = require('./modules/user.js');
const chatModel = require('./modules/chat.js');
const groupChatModel = require('./modules/groupChat.js');
const groupModel = require('./modules/group.js');
const fs = require('fs');

// user ---> friendList,groupList
// group --->userList,manager
// groupChat ---> sender
// chat ---> sender,receiver

//初始化socket连接
exports.init = function(io, host, port) {
//socket 相关
    io.on('connection', function(socket) {
        console.log(socket.id + ' is linking');
        socket.emit('init', 'webscoket连接成功！');
        /** 注册用户
         * params userdata
         * 查询是否有此用户 没有就注册
         */
        socket.on('register', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty');
                return;
            }
            userModel.findOne({username: data.username}).then(res => {
                if (res) {
                    io.sockets.connected[socket.id].emit('err', 'user is existed');
                    return;
                }
                let newUser = {
                    _id: data.username,
                    username: data.username,
                    password: crypto.createHash('md5').update(data.password).digest('base64'),//密码加密
                    name: data.name,
                    scoketId: socket.id,
                    friendList: ['robot']
                };
                userModel.create(newUser).then(user => {
                    io.sockets.connected[socket.id].emit('register', 'create user is success');
                }).catch(err => {
                    console.log(err);
                    io.sockets.connected[socket.id].emit('err', 'creat user failed');
                });
            }).catch(err => {
                console.log(err);
                io.sockets.connected[socket.id].emit('err', 'user is existed');
            });
        });
        /**
         * 用户登录
         * 登录更新用户名对应的socketId
         */
        socket.on('login', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty');
                return;
            }
            userModel.findOne({username: data.username}).then(user => {
                data.password = crypto.createHash('md5').update(data.password).digest('base64');//密码加密
                if (user.password !== data.password) {
                    io.sockets.connected[socket.id].emit('err', 'password is wrong');
                    return;
                }
                userModel.update({username: data.username}, {socketId: socket.id}).then(res => {
                    socket.emit('login', user);
                }).catch(err => {
                    console.log(err);
                    socket.emit('err', 'update user socketId was failed');
                });
            }).catch(err => {
                console.log(err);
                io.sockets.connected[socket.id].emit('err', 'user is no exist');
            })
        });
        /**
         *  上传头像
         *  data{flies: jpg;png,username:username}
         */
        socket.on('uploadUserIcon', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty ');
                return;
            }
            let time = new Date().getTime();
            let savePath = `/static/userIcon/${time}.${data.type}`;
            let hostPath = 'http://' + host + ':' + port;
            fs.writeFile('.'+ savePath, data.file, function(err) {
                if (err) {
                    console.log(err);
                    io.sockets.connected[socket.id].emit('err', 'save userIcon  failed');
                } else {
                    userModel.update({username: data.username}, {$set: {userIcon: hostPath + savePath}}).then(res => {
                        userModel.findOne({username: data.username}).then(user=>{
                            io.sockets.connected[socket.id].emit('uploadUserIcon', {
                                user: user,
                                message: 'upload userIcon success'
                            });
                        }).catch(err =>{
                            io.sockets.connected[socket.id].emit('err', 'find userInfo failed');
                        });
                    }).catch(err => {
                        io.sockets.connected[socket.id].emit('err', 'save userIcon path failed');
                    })
                }
            })
        });
        /**
         * 添加好友
         * params data{username: username,addName: addName}
         */
        socket.on('addFriend', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty');
                return;
            }
            userModel.findOne({username: data.addName}).then(addUser => {
                if (addUser === null) {
                    io.sockets.connected[socket.id].emit('err', 'can`t find the user');
                    return;
                }
                userModel.findOne({username: data.username}).then(user => {
                    if (user.friendList.includes(data.addName)) {
                        io.sockets.connected[socket.id].emit('err', 'This friend is existed');
                        return;
                    }
                    userModel.update({username: data.username}, {$addToSet: {friendList: data.addName}}).then(res => {
                        userModel.update({username: data.addName}, {$addToSet: {friendList: data.username}}).then(res => {
                            io.sockets.connected[socket.id].emit('addFriend', addUser);
                            // if(io.sockets.connected[addUser.socketId]){
                            //     io.sockets.connected[addUser.socketId].emit('addFriend', data.username);
                            // }
                        }).catch(err => {
                            console.log(err);
                            io.sockets.connected[socket.id].emit('err', err);

                        });
                    }).catch(err => {
                        console.log(err);
                        io.sockets.connected[socket.id].emit('err', err);
                    })
                }).catch(err => {
                    console.log(err);
                    io.sockets.connected[socket.id].emit('err', 'can`t find the user');
                });
            }).catch(err => {
                console.log(err);
                io.sockets.connected[socket.id].emit('err', `can't find the user ${data.addName}`);
            });
        });
        /**
         * 删除好友
         * data => {username, deleteName}
         */
        socket.on('deleteFriend', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty ');
                return;
            }
            userModel.findOne({username: data.username}).then(user => {
                if (user && user.friendList.includes(data.deleteName)) {
                    userModel.update({username: data.username}, {$pull: {friendList: data.deleteName}}).then(res => {
                        io.sockets.connected[socket.id].emit('deleteFriend', 'delete friend success');
                    }).catch(err => {
                        io.sockets.connected[socket.id].emit('err', err);
                    })
                } else {
                    io.sockets.connected[socket.id].emit('err', `can't find ${data.deleteName} in your friendList`);
                }
            }).catch(err => {
                console.log(err);
                io.sockets.connected[socket.id].emit('err', 'can`t find the user')
            });
        });
        /**
         * 获取好友列表
         * data = {username: username}
         */
        socket.on('getFriendList', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty ');
                return;
            }
            userModel.findOne({username: data.username}).populate('friendList').then(user => {
                io.sockets.connected[socket.id].emit('friendList', user.friendList);
            }).catch(err => {
                console.log(err);
                io.sockets.connected[socket.id].emit('err', 'get friendList failed');

            });
        });
        /**
         *  获取聊天记录  后续增加查询时间区间，分页等
         *  data = {
     *       sender: String,
     *      receiver: String,
     *          }
         */
        socket.on('getChatInfo', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty ');
                return;
            }
            chatModel.find({
                sender: {'$in': [data.sender, data.receiver]},
                receiver: {'$in': [data.sender, data.receiver]}
            }).populate('sender receiver').sort('sendTime').then(res => {
                let resultData = {
                    sender: data.sender,
                    receiver: data.receiver,
                    data: res
                };
                io.sockets.connected[socket.id].emit('chatInfo', resultData);
            }).catch(err => {
                console.log(err);
                io.sockets.connected[socket.id].emit('err', 'can`t find the chat message');
            })
        });
        /**
         * 发送消息给好友
         data ={
              sender: String,
              receiver: String,
              content: String
        }
         */
        socket.on('sendToOne', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty ');
                return;
            }
            let time = new Date();
            data.sendTime = time;
            chatModel.create(data).then(res => {
                userModel.findOne({username: data.receiver}).then(user => {
                    chatModel.findOne({sendTime: time}).populate('sender receiver').then(newChat=>{
                        let receiverData = {
                            receiver: data.sender,
                            data: newChat
                        };
                        if (io.sockets.connected[user.socketId]) {
                            io.sockets.connected[user.socketId].emit('newMessage', receiverData);
                        }
                        let senderData = {
                            receiver: data.receiver,
                            data: newChat
                        };
                        io.sockets.connected[socket.id].emit('newMessage', senderData);
                    }).catch(err=>{
                        io.sockets.connected[socket.id].emit('err', 'can`t find the newMessage')
                    })
                }).catch(err => {
                    console.log(err);
                    io.sockets.connected[socket.id].emit('err', 'can`t find the receiver')
                });
            }).catch(err => {
                console.log(err);
                io.sockets.connected[socket.id].emit('err', 'save chat was failed');
            });
        });
        /**
         * 获取我的群聊列表
         * data:{username: username}
         */
        socket.on('getMyGroupList', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty ');
                return;
            }
            userModel.findOne({username: data.username}).then(user => {
                groupModel.find({
                    groupName: {'$in': user.groupList}
                }).populate('userList').sort('creatTime').then(res => {
                    io.sockets.connected[socket.id].emit('getMyGroupList', res);
                }).catch(err => {
                    console.log(err);
                    io.sockets.connected[socket.id].emit('err', 'can`t find the chat message');
                });
            }).catch(err => {
                console.log(err);
                io.sockets.connected[socket.id].emit('err', 'can`t find the user');
            });
        });
        /**
         *  获取所有群聊
         */
        socket.on('getAllGroup', function(data) {
            groupModel.find().sort('creatTime').then(res => {
                io.sockets.connected[socket.id].emit('getAllGroup', res);
            }).catch(err => {
                io.sockets.connected[socket.id].emit('err', 'can`t find the chat message');
            })
        });
        /**
         * 获取未加入的群聊列表
         * data {username: username}
         */
        socket.on('getNotJoinGroup', function(data) {
            groupModel.find({
                userList: {'$nin': data.username}
            }).sort('creatTime').then(res => {
                io.sockets.connected[socket.id].emit('getNotJoinGroup', res);
            }).catch(err => {
                console.log(err);
                io.sockets.connected[socket.id].emit('err', 'can`t find the not join group');
            });
        });
        /**
         *  加入群聊
         */
        socket.on('joinGroup', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty');
                return;
            }
            groupModel.findOne({groupName: data.groupName}).then(res => {
                userModel.update({username: data.username}, {$addToSet: {groupList: data.groupName}}).then(res => {
                    groupModel.update({groupName: data.groupName}, {$addToSet: {userList: data.username}}).then(res => {
                        io.sockets.connected[socket.id].emit('joinGroup', 'join group ' + data.groupName + ' success');
                    }).catch(err => {
                        console.log(err);
                        io.sockets.connected[socket.id].emit('err', 'group add user flied');
                    })
                }).catch(err => {
                    io.sockets.connected[socket.id].emit('err', 'join group flied');
                })
            }).catch(err => {
                io.sockets.connected[socket.id].emit('err', 'can`t find the group' + data.groupName);
            })
        });
        /**
         * 新建群聊
         */
        socket.on('creatNewGroup', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty ');
                return;
            }
            groupModel.findOne({groupName: data.groupName}).then(res => {
                if (res) {
                    io.sockets.connected[socket.id].emit('err', `group ${data.groupName} is exist`);
                } else {
                    let newGroup = {
                        creatTime: new Date,
                        groupName: data.groupName,
                        admin: data.username,
                        manager: [data.username],
                        userList: [data.username]
                    };
                    groupModel.create(newGroup).then(res => {
                        io.sockets.connected[socket.id].emit('creatNewGroup', res);
                    }).catch(err => {
                        console.log(err);
                        io.sockets.connected[socket.id].emit('err', `create the group ${data.groupName} failed`);
                    })
                }
            }).catch(err => {
                io.sockets.connected[socket.id].emit('err', `find the group ${data.groupName} failed`);
            })
        });
        /**
         * 获取群聊天记录
         * data ={groupName: groupName,username:username}
         */
        socket.on('getGroupChatInfo', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty ');
                return;
            }
            groupChatModel.find({groupName: data.groupName}).populate('sender').sort('sendTime').then(res => {
                if (res) {
                    let result = {
                        groupName: data.groupName,
                        data: res
                    };
                    io.sockets.connected[socket.id].emit('getGroupChatInfo', result);
                }
            }).catch(err => {
                io.sockets.connected[socket.id].emit('err', 'can`t find the chat content');

            })
        });
        /**
         * 群聊中发送消息
         * data = { sender: sender,
         *          content:content,
         *          groupName:groupName,
         *          atUser: atUser // 必须是一个数组
         *          }
         */
        socket.on('sendMsgToGroup', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty ');
                return;
            }
            let time = new Date();
            let newChats = {
                sendTime: time,
                sender: data.sender,
                groupName: data.groupName,
                content: data.content,
                atUser: data.atUser, // @谁谁谁
            };
            groupChatModel.create(newChats).then(res => {
                if (res) {
                    groupChatModel.findOne({'sendTime': time}).populate('sender').then(res=>{
                        if(res){
                            // 发送给自己
                            io.sockets.connected[socket.id].emit('newMsgOfGroup', res);
                            // 将消息发送给群里的所有人除了自己
                            socket.broadcast.in(data.groupName).emit('newMsgOfGroup', res);
                        } else {
                            io.sockets.connected[socket.id].emit('err', 'the message data is null');
                        }
                    }).catch(err=>{
                        io.sockets.connected[socket.id].emit('err', 'can`t find the message data');
                    })
                }
            }).catch(err => {
                console.log(err);
                io.sockets.connected[socket.id].emit('err', 'send the msg failed');
            })
        });
        /**
         *  加入群聊房间
         *  data= {
         *      username:username,
         *      groupName:groupName,
         *  }
         */
        socket.on('joinRoom', function(data) {
            if (!common.checkData(data)) {
                io.sockets.connected[socket.id].emit('err', 'request params Can`t be empty');
                return;
            }
            socket.join(data.groupName, function() {
                let roomName = Object.keys(socket.rooms);
                io.to(data.groupName, `${data.username} has joined the room`);
                socket.broadcast.in('data.groupName').emit('newUserJoin', {
                    groupName: data.groupName,
                    username: data.username
                })
            });

        })
        /**
         * 测试population
         */
        socket.on('testPopulate', function(data) {
            //
            groupModel.findOne({groupName: '前端技术交流群'}).populate('userLists').then(function(res) {
                io.sockets.connected[socket.id].emit('testPopulate', res);
            })
        })
    });
};