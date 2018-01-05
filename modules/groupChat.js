var mongoose = require('mongoose');
var db = require('./db');


//定义一个Schema，不过是一些文本属性
var chatSchema = new mongoose.Schema({
    // _id:String,
    sendTime: Date,
    sender: {
        type: String,
        ref:'users'
    },
    groupName: String,
    content: String,
    atUser: [], // @谁谁谁
});

//将schema发布为Model，发布为model才算得上在数据库建了模型
var groupChatModel = db.model('groupChat',chatSchema);//对应一个user表


module.exports = groupChatModel;