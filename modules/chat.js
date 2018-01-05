var mongoose = require('mongoose');
var db = require('./db');


//定义一个Schema，不过是一些文本属性
var chatSchema = new mongoose.Schema({
    // _id:String,
    sendTime: Date,
    sender: {
        type: String,
        ref: 'users'
    },
    receiver: {
        type: String,
        ref: 'users'
    },
    content: String,
});

//将schema发布为Model，发布为model才算得上在数据库建了模型
var chatModel = db.model('chats', chatSchema);//对应一个user表


module.exports = chatModel;