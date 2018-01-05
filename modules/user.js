var mongoose = require('mongoose');
var db = require('./db');


//定义一个Schema，不过是一些文本属性
var　userSchema = new mongoose.Schema({
    _id: String,
    name: String,
    password: String,
    socketId: String,
    friendList: [{
            type: String,
            ref: 'users'
    }],
    username: String,
    groupList: [{
        type: String,
        ref: 'group'
    }],
    userIcon: String,
    signature:'',
    sex:'',
    birthday:'',
    email:'',
    phone:''
});

//将schema发布为Model，发布为model才算得上在数据库建了模型
var userModel = db.model('users',userSchema);//对应一个user表


module.exports = userModel;　